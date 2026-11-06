import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { checkedPath, digest, json, parseTask, loadTask } from './records.ts';
import type { Task } from './records.ts';
import { capture } from './context.ts';
import { indexPath, optionalText, reportRoot } from './reports.ts';

interface Change {
  path: string;
  before: string | null;
  after: string | null;
}
export interface Operation {
  version: 1;
  request: string;
  kind: 'complete' | 'reopen';
  candidate: string;
  inputs: Record<string, string>;
  changes: Change[];
  done: boolean;
}
export const operationPath = (id: string) => `.work/tasks/${id}/delivery/operation.json`;

export async function loadOperation(root: string, id: string): Promise<Operation | null> {
  const raw = await optionalText(root, operationPath(id));
  if (raw === null) return null;
  const op = JSON.parse(raw) as Operation;
  if (
    op.version !== 1 ||
    !['complete', 'reopen'].includes(op.kind) ||
    !/^[a-f0-9]{64}$/.test(op.request) ||
    !Array.isArray(op.changes) ||
    typeof op.done !== 'boolean'
  )
    throw new Error('WORK_DELIVERY_OPERATION: invalid journal');
  const allowed = (path: string) =>
    path === indexPath ||
    path === `.work/tasks/${id}/state.json` ||
    path.startsWith(`${reportRoot(id)}/`);
  const paths = new Set<string>();
  for (const change of op.changes) {
    if (
      !allowed(change.path) ||
      paths.has(change.path) ||
      (change.before !== null && typeof change.before !== 'string') ||
      (change.after !== null && typeof change.after !== 'string')
    )
      throw new Error('WORK_DELIVERY_OPERATION: invalid target');
    await checkedPath(root, change.path);
    paths.add(change.path);
  }
  const state = op.changes.at(-1);
  if (
    state?.path !== `.work/tasks/${id}/state.json` ||
    !state.after ||
    parseTask(state.after).plan.id !== id
  )
    throw new Error('WORK_DELIVERY_OPERATION: state must be last');
  return op;
}

/** Atomic per file, not a multi-file transaction. One writer per checkout. */
async function replace(root: string, id: string, change: Change) {
  const current = await optionalText(root, change.path);
  if (current === change.after) return;
  if (current !== change.before) throw new Error(`WORK_DELIVERY_CONFLICT: ${change.path}`);
  const path = await checkedPath(root, change.path);
  if (change.after === null) {
    await rm(path);
    return;
  }
  await mkdir(dirname(path), { recursive: true });
  const staging = await checkedPath(root, `.work/tasks/${id}/delivery/staged`);
  await mkdir(staging, { recursive: true });
  const temp = `${staging}/${digest(change.path)}-${randomUUID()}.tmp`;
  try {
    await writeFile(temp, change.after, { flag: 'wx' });
    if ((await optionalText(root, change.path)) !== change.before)
      throw new Error(`WORK_DELIVERY_CONFLICT: ${change.path}`);
    await rename(temp, path);
  } finally {
    await rm(temp, { force: true });
  }
}

export async function finishOperation(root: string, id: string, op: Operation) {
  const task = parseTask(op.changes.at(-1)!.after!);
  if (json((await capture(root, task)).files) !== json(op.inputs))
    throw new Error('WORK_DELIVERY_STALE: inputs changed during operation');
  // Preflight every destination before any further write. Never roll back newer edits.
  for (const change of op.changes) {
    const current = await optionalText(root, change.path);
    if (current !== change.before && current !== change.after)
      throw new Error(`WORK_DELIVERY_CONFLICT: ${change.path}`);
  }
  for (const change of op.changes) await replace(root, id, change);
  const path = operationPath(id);
  const before = await readFile(await checkedPath(root, path), 'utf8');
  await replace(root, id, { path, before, after: json({ ...op, done: true }) });
}

export async function commitDelivery(
  root: string,
  task: Task,
  raw: string,
  request: string,
  kind: Operation['kind'],
  outputs: Record<string, string | null>,
  expected: Record<string, string | null>,
) {
  const id = task.plan.id;
  const changes: Change[] = [];
  for (const [path, after] of Object.entries(outputs)) {
    const before = await optionalText(root, path);
    if (path in expected && before !== expected[path])
      throw new Error(`WORK_DELIVERY_CONFLICT: ${path}`);
    changes.push({ path, before, after });
  }
  const statePath = `.work/tasks/${id}/state.json`;
  if ((await optionalText(root, statePath)) !== raw)
    throw new Error('WORK_CONFLICT: task changed before delivery');
  changes.push({ path: statePath, before: raw, after: json(task) });
  const captured = await capture(root, task);
  if (kind === 'complete' && captured.candidate !== task.checkpoint?.candidate)
    throw new Error('WORK_DELIVERY_STALE: candidate changed before publication');
  const op: Operation = {
    version: 1,
    request,
    kind,
    candidate: captured.candidate,
    inputs: captured.files,
    changes,
    done: false,
  };
  const previous = await loadOperation(root, id);
  if (previous && !previous.done)
    throw new Error('WORK_DELIVERY_PENDING: resume the original request');
  const path = operationPath(id);
  await replace(root, id, { path, before: await optionalText(root, path), after: json(op) });
  await finishOperation(root, id, op);
}

export async function replayDelivery(
  root: string,
  id: string,
  request: string,
  verify: (task: Task, operation: Operation) => Promise<void>,
) {
  const owned = await loadTask(root, id);
  const op = await loadOperation(root, id);
  if (!op || (op.done && op.request !== request)) return false;
  if (op.request !== request) throw new Error('WORK_DELIVERY_PENDING: resume the original request');
  const state = op.changes.at(-1)!;
  const restored = parseTask(state.after!);
  if (restored.member !== owned.task.member || restored.workspace !== root)
    throw new Error('WORK_OWNER: delivery operation belongs to another workspace');
  const current = await optionalText(root, state.path);
  if (op.done && current !== state.after) return false;
  await verify(parseTask(state.after!), op);
  if (op.done) {
    for (const change of op.changes) {
      if ((await optionalText(root, change.path)) !== change.after)
        throw new Error(`WORK_DELIVERY_CONFLICT: completed output changed ${change.path}`);
    }
    return true;
  }
  await finishOperation(root, id, op);
  return true;
}

export const requestDigest = (value: unknown) => digest(json(value));
