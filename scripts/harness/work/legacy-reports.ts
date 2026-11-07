import { readFile } from 'node:fs/promises';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { checkedPath, digest, draft, identifier, json, parseTask } from './records.ts';
import type { Checkpoint, TaskPlan } from './records.ts';

export interface SharedEvidence {
  criterion: string;
  method: string;
  representation: 'original' | 'redacted' | 'excerpt';
  sourceSha256: string;
  path: string;
  sha256: string;
  environment: string;
}
export interface LegacyReport {
  version: 1;
  id: string;
  title: string;
  author: string;
  modules: string[];
  outcomes: string;
  decisions: string;
  limitations: string;
  checkpoint: Checkpoint;
  contract: Pick<
    TaskPlan,
    | 'requirement'
    | 'goal'
    | 'scope'
    | 'inputs'
    | 'sources'
    | 'nonGoals'
    | 'acceptance'
    | 'decisions'
    | 'dependencies'
  >;
  evidence: SharedEvidence[];
  acceptance?: { candidate: string; statement: string; reference: string };
}
interface LegacyEntry {
  id: string;
  status: string;
  report?: { path: string; sha256: string; candidate: string };
  review?: { path: string; sha256: string; candidate: string };
}

interface MarkdownNode {
  type: string;
  lang?: string;
  value?: string;
  children?: MarkdownNode[];
}
export function metadata(source: string, language: string): unknown {
  const tree = unified().use(remarkParse).parse(source) as MarkdownNode;
  const blocks =
    tree.children?.filter((node) => node.type === 'code' && node.lang === language) ?? [];
  if (blocks.length !== 1) throw new Error(`WORK_REPORT_FORMAT: expected one ${language} block`);
  return JSON.parse(blocks[0]!.value!);
}
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('WORK_REPORT_FORMAT: expected object');
  return value as Record<string, unknown>;
}
export function textField(value: unknown): string {
  if (typeof value !== 'string' || !value.trim())
    throw new Error('WORK_REPORT_FORMAT: expected nonempty text');
  return value;
}
export function hashField(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value))
    throw new Error('WORK_REPORT_FORMAT: expected SHA256');
  return value;
}
export function textArray(value: unknown): string[] {
  if (!Array.isArray(value)) throw new Error('WORK_REPORT_FORMAT: expected text array');
  return value.map(textField);
}
export async function optionalText(root: string, path: string): Promise<string | null> {
  try {
    return await readFile(await checkedPath(root, path), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

/** Read-only v1 contract. Historical candidates and accepted statements are never rewritten. */
export function parseReport(source: string, accepted = true): LegacyReport {
  const obj = record(metadata(source, 'mio-task-report'));
  if (obj.version !== 1) throw new Error('WORK_REPORT_FORMAT: report version');
  const report = obj as unknown as LegacyReport;
  identifier(textField(report.id));
  for (const field of ['title', 'author', 'outcomes', 'decisions', 'limitations'] as const)
    textField(report[field]);
  textArray(report.modules);
  const task = draft('', '', report.id, '');
  Object.assign(task.plan, record(report.contract));
  task.checkpoint = report.checkpoint;
  if (!task.checkpoint) throw new Error('WORK_REPORT_FORMAT: checkpoint required');
  parseTask(json(task));
  textField(task.plan.goal);
  if (!task.plan.acceptance.length)
    throw new Error('WORK_REPORT_FORMAT: acceptance criteria required');
  if (
    Object.keys(report.contract).some(
      (key) =>
        ![
          'requirement',
          'goal',
          'scope',
          'inputs',
          'sources',
          'nonGoals',
          'acceptance',
          'decisions',
          'dependencies',
        ].includes(key),
    )
  )
    throw new Error('WORK_REPORT_FORMAT: only shared contract fields are allowed');
  if (!Array.isArray(report.evidence) || report.evidence.length !== task.plan.acceptance.length)
    throw new Error('WORK_REPORT_FORMAT: one artifact per criterion');
  const seen = new Set<string>();
  for (const entry of report.evidence) {
    record(entry);
    if (
      !task.plan.acceptance.some(
        (item) => item.id === entry.criterion && item.method === entry.method,
      ) ||
      seen.has(entry.criterion)
    )
      throw new Error('WORK_REPORT_FORMAT: evidence criterion');
    seen.add(entry.criterion);
    identifier(entry.criterion);
    if (
      entry.path !== `evidence/${entry.criterion}.md` ||
      !['original', 'redacted', 'excerpt'].includes(entry.representation)
    )
      throw new Error('WORK_REPORT_FORMAT: evidence path/representation');
    hashField(entry.sourceSha256);
    hashField(entry.sha256);
    textField(entry.environment);
  }
  if (accepted || report.acceptance !== undefined) {
    const acceptance = record(report.acceptance);
    if (acceptance.candidate !== report.checkpoint.candidate)
      throw new Error('WORK_REPORT_FORMAT: acceptance candidate mismatch');
    textField(acceptance.statement);
    textField(acceptance.reference);
  }
  return report;
}

export function parseLegacyIndex(source: string) {
  const obj = record(metadata(source, 'mio-task-index'));
  if (obj.version !== 1 || !Array.isArray(obj.tasks))
    throw new Error('WORK_REPORT_FORMAT: index version/tasks');
  const seen = new Set<string>();
  for (const value of obj.tasks) {
    const entry = record(value);
    const id = identifier(textField(entry.id));
    if (seen.has(id)) throw new Error(`WORK_REPORT_FORMAT: duplicate task ${id}`);
    seen.add(id);
    textField(entry.title);
    textField(entry.requirement);
    textArray(entry.modules);
    if (!['pending', 'complete', 'reopened'].includes(String(entry.status)))
      throw new Error('WORK_REPORT_FORMAT: index status');
    if (!entry.report && entry.status !== 'pending')
      throw new Error('WORK_REPORT_FORMAT: completed/reopened task needs a report');
    for (const kind of ['report', 'review'] as const) {
      if (!entry[kind]) continue;
      const ref = record(entry[kind]);
      const folder = kind === 'report' ? 'complete' : 'pending';
      if (
        ref.path !== `docs/tasks/${folder}/${id}/report.md` ||
        (kind === 'review' && entry.status === 'complete')
      )
        throw new Error('WORK_REPORT_FORMAT: legacy report location/status');
      hashField(ref.sha256);
      hashField(ref.candidate);
    }
  }
  return obj as unknown as { version: 1; tasks: LegacyEntry[] };
}

/** Map package locations only; checkpoint.files continues to describe its original historical tree. */
export const historicalPath = (path: string) =>
  path.replace(/^docs\/tasks\//, 'docs/tasks/history/');
export async function legacyFiles(root: string): Promise<Set<string>> {
  const index = 'docs/tasks/history/index.md';
  const source = await optionalText(root, index);
  const paths = new Set<string>();
  if (source === null) return paths;
  paths.add(index);
  for (const entry of parseLegacyIndex(source).tasks) {
    for (const kind of ['report', 'review'] as const) {
      const ref = entry[kind];
      if (!ref) continue;
      const path = historicalPath(ref.path);
      const bytes = await optionalText(root, path);
      if (bytes === null || digest(bytes) !== ref.sha256)
        throw new Error(`WORK_REPORT_INTEGRITY: ${path}`);
      const report = parseReport(bytes, kind === 'report');
      if (
        report.id !== entry.id ||
        report.checkpoint.candidate !== ref.candidate ||
        (kind === 'review' && report.acceptance)
      )
        throw new Error(`WORK_REPORT_BINDING: ${path}`);
      paths.add(path);
      for (const evidence of report.evidence) {
        const attachment = `${path.slice(0, -'report.md'.length)}${evidence.path}`;
        const content = await optionalText(root, attachment);
        if (content === null || digest(content) !== evidence.sha256)
          throw new Error(`WORK_REPORT_EVIDENCE: ${attachment}`);
        paths.add(attachment);
      }
    }
  }
  return paths;
}
