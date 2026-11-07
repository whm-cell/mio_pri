import { isDeepStrictEqual } from 'node:util';
import { assess, capture, contractIssues } from './context.ts';
import { taskSummary } from './guide.ts';
import { digest, draft, initializeMember, json, loadTask, parseTask, saveTask } from './records.ts';
import type { Task, TaskPlan } from './records.ts';
import { loadConfig } from '../inventory.ts';
import { registerQualityReview } from './quality-review.ts';
import { documentCatalog, resolveDocument, resolvePrd } from '../task-documents.ts';
import { registerNormsReview } from './norms-review.ts';

const planFields = [
  'result',
  'norms',
  'goal',
  'scope',
  'inputs',
  'sources',
  'authorization',
  'nonGoals',
  'acceptance',
  'decisions',
  'dependencies',
  'blockers',
  'nextAction',
  'stopCondition',
  'sharedRef',
];

function fields(value: unknown, allowed: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('WORK_REQUEST: expected an object');
  const object = value as Record<string, unknown>;
  const unknown = Object.keys(object).filter((key) => !allowed.includes(key));
  if (unknown.length) throw new Error(`WORK_REQUEST: unsupported fields: ${unknown.join(', ')}`);
  return object;
}

/** No history, raw evidence or unrelated operation guides enter the response. */
export async function inspectTask(root: string, task: Task, raw: string) {
  let assessment;
  try {
    assessment = await assess(root, task);
  } catch (error) {
    assessment = {
      ready: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
  return { revision: digest(raw), task: taskSummary(task, 'resume'), assessment };
}

/** Stable requirement identity locates the record; a retry never replaces existing progress. */
export async function ensureTask(root: string, raw: string) {
  const request = fields(JSON.parse(raw), ['requirement', 'plan']);
  const requirement = fields(request.requirement, ['source', 'section', 'key']);
  const patch = fields(request.plan === undefined ? {} : request.plan, planFields);
  const catalog = await documentCatalog(root);
  if (typeof requirement.source === 'string')
    requirement.source = resolveDocument(requirement.source, catalog).identity;
  if (patch.result && typeof patch.result === 'object') {
    const result = patch.result as Record<string, unknown>;
    if (typeof result.prd === 'string') {
      patch.result = { ...result, prd: resolvePrd(result.prd, catalog) };
    }
  }
  // Validate the complete shape before deriving an id or creating any private files.
  const proposed = draft(root, '', 'pending', '');
  Object.assign(proposed.plan, patch, { requirement });
  parseTask(json(proposed));
  const origin = proposed.plan.requirement!;
  const id = `${origin.key.slice(0, 48)}-${digest(json([origin.source, origin.key])).slice(0, 16)}`;
  const actor = await initializeMember(root);
  let existing;
  try {
    existing = await loadTask(root, id);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  if (existing) {
    const compared = { ...existing.task.plan, ...patch };
    registerQualityReview(compared, await loadConfig(root));
    registerNormsReview(compared);
    if (
      !isDeepStrictEqual(existing.task.plan.requirement, origin) ||
      Object.entries(patch).some(
        ([key]) =>
          !isDeepStrictEqual(
            existing.task.plan[key as keyof TaskPlan],
            compared[key as keyof TaskPlan],
          ),
      )
    )
      throw new Error(`WORK_CONFLICT: inspect ${id}; use update with its current revision`);
    return { created: false, ...(await inspectTask(root, existing.task, existing.raw)) };
  }
  if (typeof patch.goal !== 'string' || !patch.goal.trim())
    throw new Error(
      'WORK_REQUEST: new tasks require plan.goal; use status to locate existing work',
    );
  const task = draft(root, actor, id, '');
  Object.assign(task.plan, patch, { requirement: origin });
  if (task.plan.result) task.delivery = { version: 2 };
  registerQualityReview(task.plan, await loadConfig(root));
  registerNormsReview(task.plan);
  task.checkpoint = await capture(root, task);
  if (!contractIssues(task).length) task.stage = 'C0_READY';
  await saveTask(root, task);
  return { created: true, ...(await inspectTask(root, task, json(task))) };
}

/** Agent assertions may update the plan and progress, never ownership, evidence or human acceptance. */
export async function updateTask(root: string, id: string, raw: string) {
  const request = fields(JSON.parse(raw), ['revision', 'reason', 'plan', 'stage', 'reopen']);
  const loaded = await loadTask(root, id);
  if (
    typeof request.revision !== 'string' ||
    typeof request.reason !== 'string' ||
    !request.reason.trim()
  )
    throw new Error('WORK_REQUEST: revision and a reconciliation reason are required');
  const patch = fields(request.plan === undefined ? {} : request.plan, planFields);
  if (patch.result && typeof patch.result === 'object') {
    const result = patch.result as Record<string, unknown>;
    if (typeof result.prd === 'string') {
      patch.result = { ...result, prd: resolvePrd(result.prd, await documentCatalog(root)) };
    }
  }
  const task = loaded.task;
  if (request.revision !== digest(loaded.raw))
    throw new Error('WORK_CONFLICT: read the current context before updating');
  if (request.reopen !== undefined && request.reopen !== true)
    throw new Error('WORK_REQUEST: reopen must be explicitly true');
  if (task.archived && !request.reopen)
    throw new Error('WORK_ARCHIVED: inspect current authorization before explicitly reopening');
  if (request.reopen) {
    if (typeof patch.authorization !== 'string' || !patch.authorization.trim())
      throw new Error('WORK_REQUEST: reopening requires the current authorization in plan');
    task.archived = false;
  }
  Object.assign(task.plan, patch);
  if (task.plan.result && task.delivery?.version !== 2) {
    if (task.delivery?.accepted)
      task.notes.push(
        `Previous v1 accepted result remains historical: ${task.delivery.accepted.path}; ${task.delivery.accepted.candidate}. No passes transfer to the new result contract.`,
      );
    task.delivery = { version: 2 };
  }
  parseTask(json(task));
  registerQualityReview(task.plan, await loadConfig(root));
  registerNormsReview(task.plan);
  const current = await capture(root, task);
  if (
    current.candidate !== task.checkpoint?.candidate ||
    contractIssues(task).length ||
    request.stage !== undefined ||
    request.reopen
  ) {
    task.reviewDecision = 'PENDING';
    task.releaseDisposition = 'HOLD_FOR_EVIDENCE';
    if (task.stage === 'C1_RELEASED') task.stage = 'C1_EVIDENCE_PENDING';
  }
  if (request.stage !== undefined) {
    if (!['C1_IMPLEMENTATION', 'C1_EVIDENCE_PENDING'].includes(request.stage as string))
      throw new Error('WORK_REQUEST: update cannot record release or human acceptance');
    if (request.stage === 'C1_IMPLEMENTATION') {
      const assessment = await assess(root, task);
      if (!assessment.ready) throw new Error(assessment.errors.join('\n'));
    }
    task.stage = request.stage as string;
  }
  task.notes.push(`${new Date().toISOString()} ${request.reason}`);
  // Contract edits invalidate the old checkpoint; only an explicit sync acknowledges the diff.
  await saveTask(root, task, loaded.raw);
  return inspectTask(root, task, json(task));
}
