import { readFile } from 'node:fs/promises';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { checkedPath, digest, draft, identifier, json, parseTask } from './records.ts';
import type { Checkpoint, TaskPlan } from './records.ts';

export const indexPath = 'docs/tasks/index.md';
export const reportPath = (id: string) => `docs/tasks/complete/${identifier(id)}/report.md`;
export const reportRoot = (id: string) => `docs/tasks/complete/${identifier(id)}`;
export const deliveryOutput = (id: string, path: string) =>
  path === indexPath || path.startsWith(`${reportRoot(id)}/`);

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
const cell = (value: string) => value.replaceAll('|', '\\|').replace(/\s+/g, ' ');
export function renderIndex(index: TaskIndex): string {
  index.tasks.sort((a, b) => a.id.localeCompare(b.id));
  const rows = index.tasks.map(
    (entry) =>
      `| ${cell(entry.id)} | ${cell(entry.title)} | ${cell(entry.modules.join('、'))} | ${cell(entry.requirement)} | ${entry.status} | ${entry.report ? `[报告](complete/${entry.id}/report.md) · ${entry.report.candidate.slice(0, 12)}` : '待接受'} |`,
  );
  return `# 任务交付索引\n\n按需求或模块查任务，再读取相关报告与必要证据；不默认展开全部历史。complete 保存最后接受的交付快照，reopened 表示已有新工作，旧报告不证明新候选通过。固定历史引用使用报告所在提交、路径和受验版本。\n\n| 任务 | 功能 | 模块 | 需求 | 协作状态 | 最后接受结果 |\n| --- | --- | --- | --- | --- | --- |\n${rows.join('\n')}\n\n\`\`\`mio-task-index\n${json(index)}\`\`\`\n`;
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
    const linked = new Set<string>();
    for (const entry of index.tasks) {
      if (!entry.report) continue;
      linked.add(entry.report.path);
      const source = await optionalText(root, entry.report.path);
      if (source === null || digest(source) !== entry.report.sha256)
        throw new Error(`WORK_REPORT_INTEGRITY: ${entry.id}`);
      const report = parseReport(source);
      if (report.id !== entry.id || report.checkpoint.candidate !== entry.report.candidate)
        throw new Error(`WORK_REPORT_BINDING: ${entry.id}`);
      for (const evidence of report.evidence) {
        const path = `${reportRoot(entry.id)}/${evidence.path}`;
        const bytes = await optionalText(root, path);
        if (bytes === null || digest(bytes) !== evidence.sha256)
          throw new Error(`WORK_REPORT_EVIDENCE: ${path}`);
      }
    }
    for (const path of files.filter((file) => file.startsWith('docs/tasks/complete/'))) {
      const entry = index.tasks.find(
        (task) => path.startsWith(`${reportRoot(task.id)}/`) && task.report,
      );
      if (!entry || !linked.has(reportPath(entry.id)))
        throw new Error(`WORK_REPORT_ORPHAN: ${path}`);
      const report = parseReport((await optionalText(root, reportPath(entry.id)))!);
      if (
        path !== reportPath(entry.id) &&
        !report.evidence.some((item) => path === `${reportRoot(entry.id)}/${item.path}`)
      )
        throw new Error(`WORK_REPORT_ORPHAN: ${path}`);
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return errors;
}
