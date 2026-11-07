import { spawnSync } from 'node:child_process';
import { access, readFile, realpath } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { beneath } from './inventory.ts';
import type { HarnessConfig } from './inventory.ts';
import { checkReports } from './work/reports.ts';
import { headingAnchors, markdownLinks, parseMarkdown } from './markdown.ts';
import type { MarkdownNode } from './markdown.ts';
import { checkApiDocuments } from './check-api-documents.ts';

/** CommonMark paths/privacy for all documents; current anchors/discovery only for active pages. */
export async function checkDocuments(
  root: string,
  files: readonly string[],
  config: HarnessConfig,
) {
  const errors: string[] = [];
  const documents = new Map<string, MarkdownNode>();
  const edges = new Map<string, string[]>();
  for (const file of files.filter((path) => path.endsWith('.md'))) {
    const source = await readFile(join(root, file), 'utf8');
    if (/\/(?:Users|Volumes|home)\//.test(source)) errors.push(`PERSONAL_PATH ${file}`);
    documents.set(file, parseMarkdown(source));
  }
  for (const [file, tree] of documents) {
    edges.set(file, []);
    const { links, destinations } = markdownLinks(tree);
    const navigation = new Set(links);
    for (const url of destinations) {
      if (/^(?:https?:|mailto:)/.test(url)) continue;
      let target: string;
      let anchor: string;
      try {
        target = decodeURIComponent(url.split('#')[0]?.split('?')[0] ?? '');
        anchor = decodeURIComponent(url.split('#').slice(1).join('#'));
      } catch {
        errors.push(`LINK_INVALID ${file}: ${url}`);
        continue;
      }
      const path = target ? resolve(dirname(join(root, file)), target) : join(root, file);
      let local = relative(root, path).replaceAll('\\', '/');
      if (
        local.startsWith('../') ||
        config.privateRoots.some((base) => beneath(local, base)) ||
        /(?:^|\/)\.env(?:\.|$)/.test(local)
      ) {
        errors.push(`LINK_PRIVATE ${file}: ${url}`);
        continue;
      }
      try {
        await access(path);
        local = relative(root, await realpath(path)).replaceAll('\\', '/');
        if (local.startsWith('../') || config.privateRoots.some((base) => beneath(local, base))) {
          errors.push(`LINK_PRIVATE ${file}: ${url}`);
          continue;
        }
        if (navigation.has(url)) edges.get(file)!.push(local);
        const destination = documents.get(local);
        if (
          anchor &&
          destination &&
          !beneath(file, 'docs/tasks/history') &&
          !beneath(local, 'docs/tasks/history') &&
          !headingAnchors(destination).has(anchor)
        )
          errors.push(`LINK_ANCHOR ${file}: ${url}`);
      } catch {
        errors.push(`LINK_MISSING ${file}: ${url}`);
      }
    }
  }
  if (documents.has('docs/index.md')) {
    const reached = new Set<string>();
    const queue = ['README.md', 'AGENTS.md'];
    for (const file of queue) {
      if (reached.has(file)) continue;
      reached.add(file);
      if (beneath(file, 'docs/tasks/history')) continue;
      for (const target of edges.get(file) ?? []) if (!reached.has(target)) queue.push(target);
    }
    for (const file of documents.keys())
      if (file.startsWith('docs/') && !beneath(file, 'docs/tasks/history') && !reached.has(file))
        errors.push(`DOCUMENT_UNREACHABLE ${file}`);
  } else if ([...documents.keys()].some((file) => file.startsWith('docs/')))
    errors.push('DOCUMENT_ENTRY_MISSING docs/index.md');
  errors.push(...checkApiDocuments(documents, edges));
  const index = spawnSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' });
  const indexChecked = index.status === 0;
  if (indexChecked) {
    for (const file of index.stdout.split('\0').filter(Boolean)) {
      if (
        [...config.privateRoots, 'node_modules', 'dist', 'coverage'].some((base) =>
          beneath(file, base),
        ) ||
        (/(?:^|\/)\.env(?:\.|$)/.test(file) && file !== '.env.example') ||
        file.endsWith('.tgz')
      ) {
        errors.push(`INDEX_PRIVATE ${file}`);
      }
    }
  }
  errors.push(...(await checkReports(root, files)));
  return { errors, indexChecked };
}
