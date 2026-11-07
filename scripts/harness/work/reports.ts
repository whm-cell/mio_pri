import { readFile } from 'node:fs/promises';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { checkedPath, digest, draft, identifier, json, parseTask } from './records.ts';
import type { Checkpoint, Task, TaskPlan } from './records.ts';

export const indexPath = 'docs/tasks/index.md';
export const reportPath = (id: string) => `docs/tasks/complete/${identifier(id)}/report.md`;
export const reportRoot = (id: string) => `docs/tasks/complete/${identifier(id)}`;
export const reviewRoot = (id: string) => `docs/tasks/pending/${identifier(id)}`;
export const reviewPath = (id: string) => `${reviewRoot(id)}/report.md`;
export const deliveryOutput = (id: string, path: string) =>
  path === indexPath ||
  path.startsWith(`${reportRoot(id)}/`) ||
  path.startsWith(`${reviewRoot(id)}/`);

export interface SharedEvidence {
  criterion: string;
  method: string;
  representation: 'original' | 'redacted' | 'excerpt';
  sourceSha256: string;
  path: string;
  sha256: string;
  environment: string;
}
export interface Report {
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
export interface IndexEntry {
  id: string;
  title: string;
  modules: string[];
  requirement: string;
  status: 'pending' | 'complete' | 'reopened';
  report?: { path: string; sha256: string; candidate: string };
  review?: { path: string; sha256: string; candidate: string };
}
export interface TaskIndex {
  version: 1;
  tasks: IndexEntry[];
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
function textArray(value: unknown): string[] {
  if (!Array.isArray(value)) throw new Error('WORK_REPORT_FORMAT: expected text array');
  return value.map(textField);
}

export function parseReport(source: string, accepted = true): Report {
  const obj = record(metadata(source, 'mio-task-report'));
  if (obj.version !== 1) throw new Error('WORK_REPORT_FORMAT: report version');
  const report = obj as unknown as Report;
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
    const criterion = task.plan.acceptance.find(
      (item) => item.id === entry.criterion && item.method === entry.method,
    );
    if (!criterion || seen.has(entry.criterion))
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

export function parseIndex(source: string): TaskIndex {
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
    if (entry.report !== undefined) {
      const ref = record(entry.report);
      if (ref.path !== reportPath(id)) throw new Error('WORK_REPORT_FORMAT: report location');
      hashField(ref.sha256);
      hashField(ref.candidate);
    } else if (entry.status !== 'pending')
      throw new Error('WORK_REPORT_FORMAT: completed/reopened task needs a report');
    if (entry.review !== undefined) {
      const ref = record(entry.review);
      if (ref.path !== reviewPath(id) || entry.status === 'complete')
        throw new Error('WORK_REPORT_FORMAT: review location/status');
      hashField(ref.sha256);
      hashField(ref.candidate);
    }
  }
  return obj as unknown as TaskIndex;
}

export async function optionalText(root: string, path: string): Promise<string | null> {
  try {
    return await readFile(await checkedPath(root, path), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}
export async function readIndex(root: string) {
  const source = await optionalText(root, indexPath);
  return {
    source,
    index: source === null ? ({ version: 1, tasks: [] } as TaskIndex) : parseIndex(source),
  };
}

/** Read the published review before replacing it; edited shared bytes must be reconciled. */
export async function reviewFiles(root: string, id: string, ref?: IndexEntry['review']) {
  const files: Record<string, string> = {};
  if (!ref) return files;
  const source = await optionalText(root, ref.path);
  if (source === null || digest(source) !== ref.sha256)
    throw new Error('WORK_DELIVERY_CONFLICT: published review changed');
  const report = parseReport(source, false);
  if (report.acceptance || report.id !== id || report.checkpoint.candidate !== ref.candidate)
    throw new Error('WORK_DELIVERY_CONFLICT: published review binding');
  files[ref.path] = source;
  for (const entry of report.evidence) {
    const path = `${reviewRoot(id)}/${entry.path}`;
    const content = await optionalText(root, path);
    if (content === null || digest(content) !== entry.sha256)
      throw new Error(`WORK_DELIVERY_CONFLICT: published review evidence changed ${path}`);
    files[path] = content;
  }
  return files;
}

/** Inspect the private draft against the current candidate and latest recorded originals. */
export async function readDraft(root: string, task: Task, candidate: string) {
  const ref = task.delivery?.draft;
  if (!ref || ref.candidate !== candidate)
    throw new Error('WORK_DELIVERY_STALE: prepare and review the current draft');
  const source = await readFile(await checkedPath(root, ref.path), 'utf8');
  if (digest(source) !== ref.sha256) throw new Error('WORK_DELIVERY_STALE: draft bytes changed');
  const report = parseReport(source, false);
  if (report.id !== task.plan.id || report.checkpoint.candidate !== candidate)
    throw new Error('WORK_DELIVERY_STALE: draft candidate mismatch');
  const attachments: Record<string, string> = {};
  for (const entry of report.evidence) {
    const original = task.evidence
      .filter(
        (item) =>
          item.criterion === entry.criterion &&
          item.method === entry.method &&
          item.candidate === candidate,
      )
      .at(-1);
    if (
      !original ||
      original.result !== 'pass' ||
      original.sha256 !== entry.sourceSha256 ||
      original.environment !== entry.environment
    )
      throw new Error('WORK_DELIVERY_STALE: evidence changed after draft preparation');
    const content = await readFile(
      await checkedPath(root, `.work/tasks/${task.plan.id}/delivery/${entry.path}`),
      'utf8',
    );
    if (digest(content) !== entry.sha256)
      throw new Error(`WORK_DELIVERY_EVIDENCE: draft attachment changed ${entry.path}`);
    attachments[entry.path] = content;
  }
  const { index, source: indexBefore } = await readIndex(root);
  const published = index.tasks.find((entry) => entry.id === task.plan.id)?.review;
  if (published) {
    if (published.sha256 !== ref.sha256 || published.candidate !== candidate)
      throw new Error('WORK_DELIVERY_STALE: published review differs from the accepted draft');
  } else if ((await optionalText(root, reviewPath(task.plan.id))) !== null) {
    throw new Error('WORK_DELIVERY_CONFLICT: published review missing from index');
  }
  const pending = await reviewFiles(root, task.plan.id, published);
  return { report, attachments, index, indexBefore, pending };
}
const cell = (value: string) => value.replaceAll('|', '\\|').replace(/\s+/g, ' ');
export function renderIndex(index: TaskIndex): string {
  index.tasks.sort((a, b) => a.id.localeCompare(b.id));
  const rows = index.tasks.map(
    (entry) =>
      `| ${cell(entry.id)} | ${cell(entry.title)} | ${cell(entry.modules.join('、'))} | ${cell(entry.requirement)} | ${entry.status} | ${entry.review ? `[待接受报告](pending/${entry.id}/report.md) · ${entry.review.candidate.slice(0, 12)}` : '无待接受报告'} | ${entry.report ? `[报告](complete/${entry.id}/report.md) · ${entry.report.candidate.slice(0, 12)}` : '尚无接受结果'} |`,
  );
  return `# 任务交付索引\n\n按需求或模块查任务，再读取相关报告与必要证据；不默认展开全部历史。pending 是指定候选的待接受快照，不证明当前源码仍匹配；complete 保存最后接受的交付快照，reopened 表示已有新工作，旧报告不证明新候选通过。固定历史引用使用报告所在提交、路径和受验版本。\n\n| 任务 | 功能 | 模块 | 需求 | 协作状态 | 待接受结果 | 最后接受结果 |\n| --- | --- | --- | --- | --- | --- | --- |\n${rows.join('\n')}\n\n\`\`\`mio-task-index\n${json(index)}\`\`\`\n`;
}
export function renderReport(report: Report): string {
  const links = report.evidence
    .map(
      (entry) =>
        `- ${entry.criterion} (${entry.method}, ${entry.representation}): [原件/摘录](${entry.path})`,
    )
    .join('\n');
  return `# ${report.title}\n\n任务：${report.id}；实施者：${report.author}。本报告是指定候选的交付快照，当前规则以现行规格为准。\n\n## 完成功能\n\n${report.outcomes}\n\n## 必要决定\n\n${report.decisions}\n\n## 限制\n\n${report.limitations}\n\n## 验收依据\n\n${links}\n\n接受：${report.acceptance ? `${report.acceptance.statement}\n\n来源：${report.acceptance.reference}` : '待真实结果接受；草稿不能作为完成结论。'}\n\n\`\`\`mio-task-report\n${json(report)}\`\`\`\n`;
}

/** Validate only public bytes, never the author's .work. */
export async function checkReports(root: string, files: readonly string[]): Promise<string[]> {
  const errors: string[] = [];
  try {
    const { index } = await readIndex(root);
    const linked = new Map<string, Set<string>>();
    for (const entry of index.tasks) {
      for (const [kind, ref] of [
        ['report', entry.report],
        ['review', entry.review],
      ] as const) {
        if (!ref) continue;
        const source = await optionalText(root, ref.path);
        if (source === null || digest(source) !== ref.sha256)
          throw new Error(`WORK_REPORT_INTEGRITY: ${entry.id}`);
        const report = parseReport(source, kind === 'report');
        if (kind === 'review' && report.acceptance)
          throw new Error(`WORK_REPORT_FORMAT: pending review cannot record acceptance`);
        if (report.id !== entry.id || report.checkpoint.candidate !== ref.candidate)
          throw new Error(`WORK_REPORT_BINDING: ${entry.id}`);
        const base = kind === 'report' ? reportRoot(entry.id) : reviewRoot(entry.id);
        const paths = new Set([ref.path]);
        for (const evidence of report.evidence) {
          const path = `${base}/${evidence.path}`;
          const bytes = await optionalText(root, path);
          if (bytes === null || digest(bytes) !== evidence.sha256)
            throw new Error(`WORK_REPORT_EVIDENCE: ${path}`);
          paths.add(path);
        }
        linked.set(base, paths);
      }
    }
    for (const path of files.filter(
      (file) => file.startsWith('docs/tasks/complete/') || file.startsWith('docs/tasks/pending/'),
    )) {
      const base = path.split('/').slice(0, 4).join('/');
      if (!linked.get(base)?.has(path)) throw new Error(`WORK_REPORT_ORPHAN: ${path}`);
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return errors;
}
