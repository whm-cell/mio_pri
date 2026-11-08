import { readFile, stat } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { beneath, loadConfig } from './inventory.ts';
import type { HarnessConfig, TaskDocument } from './inventory.ts';
import { markdownLinks, nodeText, parseMarkdown } from './markdown.ts';
import type { MarkdownNode } from './markdown.ts';
import { checkedPath } from './work/records.ts';
import { prdDirectory } from './work/compact-store.ts';

export const resultDocument = (path: string) =>
  /^docs\/tasks\/[a-z0-9][a-z0-9_-]*\/complete\//.test(path);
export const taskNavigation = (path: string) => path === 'docs/tasks/index.md';

export function publicDocument(path: string, config: HarnessConfig): boolean {
  return (
    path.endsWith('.md') &&
    config.documentRoots.some((base) => beneath(path, base)) &&
    ![...config.privateRoots, ...config.generatedRoots].some((base) => beneath(path, base)) &&
    !path.split('/').some((part) => /^\.env(?:\.|$)/.test(part))
  );
}

function documentShape(value: unknown): TaskDocument {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('TASK_DOCUMENT_SCHEMA: expected an entry');
  const entry = value as TaskDocument;
  if (
    Object.keys(entry).some((key) => !['identity', 'kind', 'path', 'aliases'].includes(key)) ||
    typeof entry.identity !== 'string' ||
    typeof entry.path !== 'string' ||
    !['prd', 'design', 'proposal'].includes(entry.kind) ||
    (entry.aliases !== undefined &&
      (!Array.isArray(entry.aliases) || entry.aliases.some((path) => typeof path !== 'string')))
  )
    throw new Error('TASK_DOCUMENT_SCHEMA: identity, kind, path and optional aliases required');
  if (new Set(entry.aliases).size !== (entry.aliases ?? []).length)
    throw new Error(`TASK_DOCUMENT_DUPLICATE: aliases for ${entry.identity}`);
  if (entry.identity !== entry.path && !entry.aliases?.includes(entry.identity))
    throw new Error(`TASK_DOCUMENT_IDENTITY: retain ${entry.identity} as an alias`);
  if (
    !beneath(entry.path, 'docs/tasks') ||
    resultDocument(entry.path) ||
    taskNavigation(entry.path)
  )
    throw new Error(`TASK_DOCUMENT_LOCATION: ${entry.path}`);
  return entry;
}

/** Compatibility pages contain navigation only; task prose belongs at the current path. */
function redirectOnly(source: string, alias: string, entry: TaskDocument, paths: Set<string>) {
  const tree = parseMarkdown(source);
  const [title, ...body] = tree.children ?? [];
  if (title?.type !== 'heading' || title.depth !== 1 || nodeText(title) !== '资料已迁移')
    return false;
  const navigation = (node: MarkdownNode): boolean => {
    if (['link', 'linkReference', 'definition'].includes(node.type)) return true;
    if (node.type === 'text') return !node.value?.trim();
    if (node.type === 'html') return /^(?:<a id="[^"<>]+">|<\/a>)$/.test(node.value ?? '');
    return (
      ['paragraph', 'list', 'listItem'].includes(node.type) && !!node.children?.every(navigation)
    );
  };
  try {
    const { links, destinations } = markdownLinks(tree);
    const targetPath = (url: string) => {
      const target = decodeURIComponent(url.split('#')[0]?.split('?')[0] ?? '');
      return relative('.', resolve(dirname(alias), target)).replaceAll('\\', '/');
    };
    return (
      body.every(navigation) &&
      links[0] !== undefined &&
      targetPath(links[0]) === entry.path &&
      [...links, ...destinations].every((url) => paths.has(targetPath(url)))
    );
  } catch {
    return false;
  }
}

/** Read-only validation of the single registry; legacy fixtures may omit the field entirely. */
export async function inspectTaskDocuments(root: string, config: HarnessConfig) {
  const documents: TaskDocument[] = [];
  const errors: string[] = [];
  const claimed = new Set<string>();
  if (config.taskDocuments !== undefined && !Array.isArray(config.taskDocuments))
    return { documents, errors: ['TASK_DOCUMENT_SCHEMA: taskDocuments must be an array'] };
  for (const value of config.taskDocuments ?? []) {
    try {
      const entry = documentShape(value);
      for (const path of new Set([entry.identity, entry.path, ...(entry.aliases ?? [])])) {
        if (claimed.has(path)) throw new Error(`TASK_DOCUMENT_DUPLICATE: ${path}`);
        claimed.add(path);
        if (!publicDocument(path, config) || resultDocument(path) || taskNavigation(path))
          throw new Error(`TASK_DOCUMENT_PUBLIC: ${path}`);
        if (!(await stat(await checkedPath(root, path))).isFile())
          throw new Error(`TASK_DOCUMENT_FILE: ${path}`);
      }
      if (entry.aliases?.includes(entry.path))
        throw new Error(`TASK_DOCUMENT_DUPLICATE: current path is also an alias ${entry.path}`);
      documents.push(entry);
    } catch (error) {
      errors.push(
        `TASK_DOCUMENT_INVALID: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  const paths = new Set(documents.map((entry) => entry.path));
  const owners = new Set<string>();
  for (const entry of documents.filter((item) => item.kind === 'prd')) {
    try {
      const directory = prdDirectory(entry.path);
      if (owners.has(directory)) throw new Error(`TASK_DOCUMENT_DUPLICATE: ${directory}`);
      owners.add(directory);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  for (const entry of documents.filter((item) => item.kind !== 'prd')) {
    const directory = entry.path.split('/').slice(0, 3).join('/');
    if (
      !owners.has(directory) ||
      (beneath(entry.path, `${directory}/pending`) && entry.kind !== 'proposal')
    )
      errors.push(
        `TASK_DOCUMENT_OWNER: ${entry.path}: require its PRD directory and classify pending as proposal`,
      );
  }
  for (const entry of documents) {
    for (const alias of entry.aliases ?? []) {
      const source = await readFile(await checkedPath(root, alias), 'utf8');
      if (!redirectOnly(source, alias, entry, paths))
        errors.push(`TASK_DOCUMENT_REDIRECT: ${alias}: retain short navigation only`);
    }
  }
  return { documents, errors };
}

export async function documentCatalog(root: string, config?: HarnessConfig) {
  const current = config ?? (await loadConfig(root));
  const registry = await inspectTaskDocuments(root, current);
  if (registry.errors.length) throw new Error(registry.errors.join('\n'));
  return { config: current, documents: registry.documents };
}

/** New requests normalize identities. Historical parsers and accepted manifests never call this. */
export function resolveDocument(
  path: string,
  catalog: Awaited<ReturnType<typeof documentCatalog>>,
) {
  if (
    [...catalog.config.privateRoots, ...catalog.config.generatedRoots].some((base) =>
      beneath(path, base),
    ) ||
    path.split('/').some((part) => /^\.env(?:\.|$)/.test(part))
  )
    throw new Error(`WORK_PRIVATE: ${path}`);
  const entry = catalog.documents.find(
    (item) => item.identity === path || item.path === path || item.aliases?.includes(path),
  );
  if (entry) return { ...entry, currentPath: entry.path };
  if (
    !publicDocument(path, catalog.config) ||
    (beneath(path, 'docs/tasks') && !taskNavigation(path) && !resultDocument(path))
  )
    throw new Error(`WORK_SOURCE: name a classified public Markdown file: ${path}`);
  return { identity: path, currentPath: path, aliases: [] as string[], kind: undefined };
}

export function resolvePrd(path: string, catalog: Awaited<ReturnType<typeof documentCatalog>>) {
  const resolved = resolveDocument(path, catalog);
  if (resolved.kind !== 'prd')
    throw new Error('WORK_RESULT: result.prd must identify a registered PRD');
  return resolved.identity;
}
