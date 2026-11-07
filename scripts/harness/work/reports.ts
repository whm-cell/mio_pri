import { readFile } from 'node:fs/promises';
import { dirname, relative } from 'node:path';
import { format } from 'prettier';
import {
  checkedPath,
  digest,
  draft,
  identifier,
  json,
  methods,
  parseTask,
  resultBookPath,
} from './records.ts';
import type { Checkpoint, Task, TaskPlan } from './records.ts';
import {
  hashField,
  legacyFiles,
  metadata,
  optionalText,
  record,
  textArray,
  textField,
} from './legacy-reports.ts';
import type { SharedEvidence } from './legacy-reports.ts';

export { hashField, metadata, optionalText, record, textField } from './legacy-reports.ts';
export type { SharedEvidence } from './legacy-reports.ts';
export const indexPath = 'docs/tasks/index.md';
export const reportPath = resultBookPath;
const reportRoot = (prd: string) => dirname(reportPath(prd));
export const evidenceRoot = (result: NonNullable<TaskPlan['result']>) =>
  `${reportRoot(result.prd)}/evidence/${identifier(result.key)}`;
export const resultPath = (result: NonNullable<TaskPlan['result']>) =>
  `${reportRoot(result.prd)}/results/${identifier(result.key)}.md`;

/** The book is navigation; sibling results' actual evidence remains an ordinary input. */
export function deliveryOutput(task: Task, path: string) {
  if (task.delivery?.version === 1)
    return (
      path === indexPath ||
      path.startsWith(`docs/tasks/complete/${task.plan.id}/`) ||
      path.startsWith(`docs/tasks/pending/${task.plan.id}/`)
    );
  const target = task.plan.result;
  return (
    !!target &&
    (path === indexPath ||
      path === reportPath(target.prd) ||
      path === resultPath(target) ||
      path.startsWith(`${evidenceRoot(target)}/`))
  );
}
export interface PublicResult {
  key: string;
  title: string;
  modules: string[];
  outcomes: string;
  decisions: string;
  limitations: string;
  version: Omit<Checkpoint, 'branch'>;
  criteria: TaskPlan['acceptance'];
  evidence: SharedEvidence[];
  acceptance?: { candidate: string; statement: string; reference: string };
}
export interface ResultBook {
  version: 2 | 3;
  prd: string;
  results: PublicResult[];
}
interface ResultNavigation {
  version: 3;
  prd: string;
  results: { key: string; title: string; path: string; sha256: string }[];
}
export interface TaskIndex {
  version: 2;
  prds: { prd: string; report: { path: string; sha256: string } }[];
  history?: { path: string; sha256: string };
}
export interface ResultDraft {
  version: 2;
  prd: string;
  result: PublicResult;
}
function fields(obj: object, allowed: string[]) {
  if (Object.keys(obj).some((key) => !allowed.includes(key)))
    throw new Error('WORK_REPORT_FORMAT: unsupported field');
}

function parseResult(value: unknown, prd: string, accepted: boolean): PublicResult {
  const result = record(value) as unknown as PublicResult;
  fields(result, [
    'key',
    'title',
    'modules',
    'outcomes',
    'decisions',
    'limitations',
    'version',
    'criteria',
    'evidence',
    'acceptance',
  ]);
  identifier(textField(result.key));
  for (const key of ['title', 'outcomes', 'decisions', 'limitations'] as const)
    textField(result[key]);
  textArray(result.modules);
  const version = record(result.version);
  fields(version, ['candidate', 'head', 'files', 'contract']);
  const task = draft('', '', 'public-result', '');
  task.plan.result = { prd, key: result.key };
  task.plan.acceptance = result.criteria;
  task.checkpoint = { ...result.version, branch: null };
  parseTask(json(task));
  if (!result.criteria.length) throw new Error('WORK_REPORT_FORMAT: criteria required');
  for (const criterion of result.criteria) {
    identifier(criterion.id);
    if (!methods.includes(criterion.method))
      throw new Error('WORK_REPORT_FORMAT: criterion method');
  }
  if (!Array.isArray(result.evidence) || result.evidence.length !== result.criteria.length)
    throw new Error('WORK_REPORT_FORMAT: one artifact per criterion');
  const seen = new Set<string>();
  for (const entry of result.evidence) {
    fields(record(entry), [
      'criterion',
      'method',
      'representation',
      'sourceSha256',
      'path',
      'sha256',
      'environment',
    ]);
    if (
      !result.criteria.some(
        (criterion) => criterion.id === entry.criterion && criterion.method === entry.method,
      ) ||
      seen.has(entry.criterion)
    )
      throw new Error('WORK_REPORT_FORMAT: evidence criterion');
    seen.add(entry.criterion);
    const own = `${evidenceRoot({ prd, key: result.key })}/${entry.criterion}.md`;
    if (
      entry.path !== own &&
      !/^docs\/tasks\/history\/(?:complete|pending)\/[a-z0-9_-]+\/evidence\/[a-z0-9_-]+\.md$/.test(
        entry.path,
      )
    )
      throw new Error('WORK_REPORT_FORMAT: evidence location');
    if (!['original', 'redacted', 'excerpt'].includes(entry.representation))
      throw new Error('WORK_REPORT_FORMAT: representation');
    hashField(entry.sourceSha256);
    hashField(entry.sha256);
    textField(entry.environment);
  }
  if (accepted || result.acceptance !== undefined) {
    const acceptance = record(result.acceptance);
    fields(acceptance, ['candidate', 'statement', 'reference']);
    if (acceptance.candidate !== result.version.candidate)
      throw new Error('WORK_REPORT_FORMAT: acceptance candidate mismatch');
    textField(acceptance.statement);
    textField(acceptance.reference);
  }
  return result;
}
export function parseBook(source: string): ResultBook {
  const book = record(metadata(source, 'mio-prd-results'));
  fields(book, ['version', 'prd', 'results']);
  if (book.version !== 2 || !Array.isArray(book.results))
    throw new Error('WORK_REPORT_FORMAT: book version/results');
  const prd = textField(book.prd);
  const results = book.results.map((result) => parseResult(result, prd, true));
  if (new Set(results.map((result) => result.key)).size !== results.length)
    throw new Error('WORK_REPORT_FORMAT: duplicate result key');
  return { version: 2, prd, results };
}
export function parseNavigation(source: string): ResultNavigation {
  const value = record(metadata(source, 'mio-prd-results'));
  fields(value, ['version', 'prd', 'results']);
  if (value.version !== 3 || !Array.isArray(value.results))
    throw new Error('WORK_REPORT_FORMAT: navigation version/results');
  const prd = textField(value.prd);
  const seen = new Set<string>();
  for (const item of value.results) {
    const ref = record(item);
    fields(ref, ['key', 'title', 'path', 'sha256']);
    const key = identifier(textField(ref.key));
    if (seen.has(key)) throw new Error('WORK_REPORT_FORMAT: duplicate result key');
    seen.add(key);
    textField(ref.title);
    hashField(ref.sha256);
    if (ref.path !== resultPath({ prd, key }))
      throw new Error('WORK_REPORT_FORMAT: result location');
  }
  return value as unknown as ResultNavigation;
}
export function parseResultPage(source: string) {
  const value = record(metadata(source, 'mio-prd-result'));
  fields(value, ['version', 'prd', 'result']);
  if (value.version !== 3) throw new Error('WORK_REPORT_FORMAT: result page version');
  const prd = textField(value.prd);
  return { prd, result: parseResult(value.result, prd, true) };
}
/** A reader can target the working tree or Git HEAD without changing result identity. */
export async function loadBook(source: string, read: (path: string) => Promise<string | null>) {
  if (record(metadata(source, 'mio-prd-results')).version === 2)
    return { book: parseBook(source), details: {} as Record<string, string> };
  const navigation = parseNavigation(source);
  const details: Record<string, string> = {};
  const results: PublicResult[] = [];
  for (const ref of navigation.results) {
    const bytes = await read(ref.path);
    if (bytes === null || digest(bytes) !== ref.sha256)
      throw new Error(`WORK_REPORT_RESULT: ${ref.path}`);
    const page = parseResultPage(bytes);
    if (
      page.prd !== navigation.prd ||
      page.result.key !== ref.key ||
      page.result.title !== ref.title
    )
      throw new Error('WORK_REPORT_BINDING: result/navigation mismatch');
    if (!(await sameMarkdown(bytes, renderResultPage(page.prd, page.result))))
      throw new Error(`WORK_REPORT_INTEGRITY: result content ${ref.path}`);
    details[ref.path] = bytes;
    results.push(page.result);
  }
  const book: ResultBook = { version: 3, prd: navigation.prd, results };
  if (!(await sameMarkdown(source, renderBook(book, details))))
    throw new Error('WORK_REPORT_INTEGRITY: navigation content differs from its entries');
  return { book, details };
}
async function sameMarkdown(actual: string, expected: string) {
  const options = { parser: 'markdown', printWidth: 100 };
  const texts = await Promise.all([format(actual, options), format(expected, options)]);
  return texts[0] === texts[1];
}
export function parseDraft(source: string): ResultDraft {
  const value = record(metadata(source, 'mio-result-draft'));
  fields(value, ['version', 'prd', 'result']);
  if (value.version !== 2) throw new Error('WORK_REPORT_FORMAT: draft version');
  const prd = textField(value.prd);
  const result = parseResult(value.result, prd, false);
  if (result.acceptance) throw new Error('WORK_REPORT_FORMAT: draft cannot contain acceptance');
  return { version: 2, prd, result };
}
export function parseIndex(source: string): TaskIndex {
  const index = record(metadata(source, 'mio-prd-index'));
  fields(index, ['version', 'prds', 'history']);
  if (index.version !== 2 || !Array.isArray(index.prds))
    throw new Error('WORK_REPORT_FORMAT: index version/prds');
  const seen = new Set<string>();
  for (const value of index.prds) {
    const entry = record(value);
    fields(entry, ['prd', 'report']);
    const prd = textField(entry.prd);
    if (seen.has(prd)) throw new Error('WORK_REPORT_FORMAT: duplicate PRD');
    seen.add(prd);
    const ref = record(entry.report);
    fields(ref, ['path', 'sha256']);
    if (ref.path !== reportPath(prd)) throw new Error('WORK_REPORT_FORMAT: book location');
    hashField(ref.sha256);
  }
  if (index.history !== undefined) {
    const history = record(index.history);
    fields(history, ['path', 'sha256']);
    if (history.path !== 'docs/tasks/history/index.md')
      throw new Error('WORK_REPORT_FORMAT: history location');
    hashField(history.sha256);
  }
  return index as unknown as TaskIndex;
}
export async function readIndex(root: string) {
  const source = await optionalText(root, indexPath);
  const index = source === null ? { version: 2 as const, prds: [] } : parseIndex(source);
  if (source !== null) {
    const options = { parser: 'markdown', printWidth: 100 };
    const [actual, expected] = await Promise.all([
      format(source, options),
      format(renderIndex(index), options),
    ]);
    if (actual !== expected)
      throw new Error('WORK_REPORT_INTEGRITY: index content differs from its entries');
  }
  return { source, index };
}
export async function readBook(root: string, prd: string, index: TaskIndex) {
  const source = await optionalText(root, reportPath(prd));
  const ref = index.prds.find((entry) => entry.prd === prd)?.report;
  if (
    (source === null) !== (ref === undefined) ||
    (source !== null && digest(source) !== ref?.sha256)
  )
    throw new Error('WORK_DELIVERY_CONFLICT: book/index mismatch');
  const { book, details } =
    source === null
      ? { book: { version: 3 as const, prd, results: [] }, details: {} as Record<string, string> }
      : await loadBook(source, (path) => optionalText(root, path));
  if (book.prd !== prd) throw new Error('WORK_REPORT_BINDING: PRD mismatch');
  for (const result of book.results) await resultFiles(root, result);
  return { book, source, details };
}
export async function resultFiles(root: string, result: PublicResult) {
  const files: Record<string, string> = {};
  for (const entry of result.evidence) {
    const bytes = await optionalText(root, entry.path);
    if (bytes === null || digest(bytes) !== entry.sha256)
      throw new Error(`WORK_REPORT_EVIDENCE: ${entry.path}`);
    files[entry.path] = bytes;
  }
  return files;
}

/** Private preparation never publishes progress or transfers acceptance. */
export async function readDraft(root: string, task: Task, candidate: string) {
  const ref = task.delivery?.draft;
  if (task.delivery?.version !== 2 || !ref || ref.candidate !== candidate)
    throw new Error('WORK_DELIVERY_STALE: prepare the current result draft');
  const source = await readFile(await checkedPath(root, ref.path), 'utf8');
  if (digest(source) !== ref.sha256) throw new Error('WORK_DELIVERY_STALE: draft bytes changed');
  const draft = parseDraft(source);
  if (
    draft.prd !== task.plan.result?.prd ||
    draft.result.key !== task.plan.result.key ||
    draft.result.version.candidate !== candidate
  )
    throw new Error('WORK_DELIVERY_STALE: draft result/candidate mismatch');
  const attachments: Record<string, string> = {};
  for (const entry of draft.result.evidence) {
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
      await checkedPath(
        root,
        `.work/tasks/${task.plan.id}/delivery/evidence/${entry.criterion}.md`,
      ),
      'utf8',
    );
    if (digest(content) !== entry.sha256)
      throw new Error(`WORK_DELIVERY_EVIDENCE: draft attachment changed ${entry.path}`);
    attachments[entry.path] = content;
  }
  return { draft, attachments };
}
const link = (from: string, to: string) =>
  relative(dirname(from), to)
    .replaceAll('\\', '/')
    .split('/')
    .map((part) =>
      encodeURIComponent(part).replace(
        /[!'()*]/g,
        (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
      ),
    )
    .join('/');
const label = (value: string) => value.replace(/[\\[\]`*_<>]/g, '\\$&');
const cell = (value: string) => value.replaceAll('|', '\\|').replace(/\s+/g, ' ');
export function renderIndex(index: TaskIndex): string {
  index.prds.sort((a, b) => a.prd.localeCompare(b.prd));
  const rows = index.prds
    .map(
      (entry) =>
        `| [${cell(label(entry.prd))}](${link(indexPath, entry.prd)}) | [已接受成果](${link(indexPath, entry.report.path)}) |`,
    )
    .join('\n');
  const history = index.history
    ? `\n[历史护栏维护与交付依据](history/index.md)：保留当时的候选、接受和验证范围，不计入 PRD 开发进度。\n`
    : '';
  return `# PRD 成果索引\n\n每份 PRD 一个公共成果入口，只登记已验证并接受的开发能力。表中入口及成果数量不代表整份 PRD 已完成；当前需求与未完成项回到 PRD。个人进度、待接受草稿和维护收尾留在本人的工作记录。\n\n| PRD | 已接受成果 |\n| --- | --- |\n${rows}\n${history}\n\`\`\`mio-prd-index\n${json(index)}\`\`\`\n`;
}
function resultBody(result: PublicResult, path: string, privateDraft = false) {
  const links = result.evidence
    .map(
      (entry) =>
        `- ${entry.criterion} (${entry.method}, ${entry.representation}): [公开依据](${privateDraft ? `evidence/${entry.criterion}.md` : link(path, entry.path)})`,
    )
    .join('\n');
  return `## ${result.key}\n\n**${result.title}**\n\n${result.outcomes}\n\n必要决定：${result.decisions}\n\n限制：${result.limitations}\n\n受验候选：${result.version.candidate}；Git HEAD：${result.version.head ?? '未提交仓库'}。精确文件摘要与契约摘要见下方版本绑定，不把 HEAD 当作未提交内容的身份。\n\n${links}\n\n接受：${result.acceptance ? `${result.acceptance.statement}\n\n来源：${result.acceptance.reference}` : '待针对本候选的真实结果接受。'}\n`;
}
export function renderResultPage(prd: string, result: PublicResult): string {
  const path = resultPath({ prd, key: result.key });
  return `# 已接受开发成果详情\n\nPRD：[${label(prd)}](${link(path, prd)})；[成果导航](${link(path, reportPath(prd))}#${result.key})。本页仅表示下面候选的接受范围，不代表当前源码或整份 PRD 完成。\n\n${resultBody(result, path)}\n\`\`\`mio-prd-result\n${json({ version: 3, prd, result })}\`\`\`\n`;
}
export function renderBook(book: ResultBook, details: Record<string, string>): string {
  const navigation: ResultNavigation = {
    version: 3,
    prd: book.prd,
    results: book.results.map((result) => {
      const path = resultPath({ prd: book.prd, key: result.key });
      if (details[path] === undefined) throw new Error(`WORK_REPORT_RESULT: ${path}`);
      return { key: result.key, title: result.title, path, sha256: digest(details[path]!) };
    }),
  };
  const entries = navigation.results
    .map(
      (ref) =>
        `## ${ref.key}\n\n[${label(ref.title)}](${link(reportPath(book.prd), ref.path)})：按需读取结果、受验版本、决定、限制与必要依据。\n`,
    )
    .join('\n');
  return `# 已接受开发成果\n\nPRD：[${label(book.prd)}](${link(reportPath(book.prd), book.prd)})。这里只导航已接受结果，不宣称整份 PRD、当前源码或生产验收完成。每项保留自己的受验版本；新工作不会自动继承旧通过。\n\n${entries}\n\`\`\`mio-prd-results\n${json(navigation)}\`\`\`\n`;
}
export function renderDraft(draft: ResultDraft): string {
  return `# 开发成果待接受草稿\n\nPRD：${label(draft.prd)}。本草稿留在个人记录，不能作为已完成结论。\n\n${resultBody(draft.result, reportPath(draft.prd), true)}\n\`\`\`mio-result-draft\n${json(draft)}\`\`\`\n`;
}

/** Validate public packages without the author's private records or original logs. */
export async function checkReports(root: string, files: readonly string[]): Promise<string[]> {
  try {
    const { index, source } = await readIndex(root);
    const linked = await legacyFiles(root);
    if (linked.size && !index.history)
      throw new Error('WORK_REPORT_INTEGRITY: history index is not linked');
    if (index.history) {
      const history = await optionalText(root, index.history.path);
      if (history === null || digest(history) !== index.history.sha256)
        throw new Error('WORK_REPORT_INTEGRITY: history index');
    }
    if (source !== null) linked.add(indexPath);
    for (const entry of index.prds) {
      const { book, details } = await readBook(root, entry.prd, index);
      await checkedPath(root, book.prd);
      if ((await optionalText(root, book.prd)) === null)
        throw new Error('WORK_REPORT_SOURCE: PRD missing');
      linked.add(entry.report.path);
      for (const path of Object.keys(details)) linked.add(path);
      for (const result of book.results)
        for (const evidence of result.evidence) linked.add(evidence.path);
    }
    for (const file of files.filter((path) => path.startsWith('docs/tasks/'))) {
      if (!linked.has(file)) throw new Error(`WORK_REPORT_ORPHAN: ${file}`);
    }
    return [];
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)];
  }
}
