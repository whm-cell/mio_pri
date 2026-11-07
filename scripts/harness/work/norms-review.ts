import { beneath } from '../inventory.ts';
import { documentCatalog, publicDocument } from '../task-documents.ts';
import type { Checkpoint, TaskPlan } from './records.ts';
import { metadata, record, textField } from './reports.ts';

export const normsCriterion = {
  id: 'norms-review',
  method: 'review',
  criterion:
    '核对当前规范是否覆盖本次成果；必要正文在 verify 前更新，逐页审阅当前候选并记录依据、结论与限制。',
};

export function registerNormsReview(plan: TaskPlan) {
  const existing = plan.acceptance.find((item) => item.id === normsCriterion.id);
  if (existing && existing.method !== 'review')
    throw new Error('WORK_NORMS_CONTRACT: norms-review must use method review');
  if (plan.result && !existing) plan.acceptance = [...plan.acceptance, { ...normsCriterion }];
}

/** A missing declaration is a delivery gate, not an implicit migration of old records. */
export async function normsIssues(root: string, plan: TaskPlan): Promise<string[]> {
  if (!plan.result) return [];
  const errors: string[] = [];
  if (!plan.norms)
    errors.push('WORK_NORMS_CONTRACT: use work update to declare plan.norms.paths and reason');
  if (!plan.acceptance.some((item) => item.id === normsCriterion.id && item.method === 'review'))
    errors.push('WORK_NORMS_CONTRACT: register norms-review with method review using work update');
  const catalog = await documentCatalog(root);
  const aliases = new Set(catalog.documents.flatMap((item) => item.aliases ?? []));
  for (const path of plan.norms?.paths ?? [])
    if (
      !publicDocument(path, catalog.config) ||
      (!beneath(path, 'docs') && !['README.md', 'AGENTS.md'].includes(path)) ||
      beneath(path, 'docs/tasks') ||
      aliases.has(path) ||
      catalog.documents.some((item) => item.path === path || item.identity === path)
    )
      errors.push(`WORK_NORMS_PATH: use a current normative document: ${path}`);
  return errors;
}

/** The operator supplies real page observations; the CLI only checks their binding and shape. */
export function normsReviewResult(source: string, plan: TaskPlan, current: Checkpoint) {
  const report = record(metadata(source, 'mio-norms-review'));
  if (report.candidate !== current.candidate || !plan.norms || report.reason !== plan.norms.reason)
    throw new Error('WORK_NORMS_EVIDENCE: candidate or declaration mismatch');
  textField(report.reviewer);
  textField(report.limitations);
  if (!Array.isArray(report.documents) || report.documents.length !== plan.norms.paths.length)
    throw new Error('WORK_NORMS_EVIDENCE: observations for every normative page required');
  const seen = new Set<string>();
  for (const value of report.documents) {
    const observation = record(value);
    const path = textField(observation.path);
    if (
      seen.has(path) ||
      !plan.norms.paths.includes(path) ||
      !current.files[path] ||
      observation.sha256 !== current.files[path]
    )
      throw new Error('WORK_NORMS_EVIDENCE: normative page hash/path mismatch');
    seen.add(path);
    textField(observation.assessment);
  }
  const conclusion = record(report.conclusion);
  if (!['pass', 'fail', 'pending'].includes(String(conclusion.result)))
    throw new Error('WORK_NORMS_EVIDENCE: explicit conclusion required');
  textField(conclusion.evidence);
  return conclusion.result as 'pass' | 'fail' | 'pending';
}
