import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { assess, capture } from '../scripts/harness/work/context.ts';
import { deliver, markdown } from '../scripts/harness/work/delivery.ts';
import { loadOperation, operationPath } from '../scripts/harness/work/delivery-store.ts';
import { handoff, receive } from '../scripts/harness/work/handoff.ts';
import { updateTask } from '../scripts/harness/work/manage.ts';
import {
  checkReports,
  indexPath,
  parseIndex,
  parseReport,
  reportPath,
  renderIndex,
  reviewPath,
} from '../scripts/harness/work/reports.ts';
import {
  digest,
  draft,
  initializeMember,
  json,
  loadTask,
  saveTask,
} from '../scripts/harness/work/records.ts';
import { checkDocuments } from '../scripts/harness/check-documents.ts';
import { inventory, loadConfig } from '../scripts/harness/inventory.ts';
import { reviewFixture, reviewMarkdown } from './quality-review-fixture.ts';

const project = resolve('.');
const scratch: string[] = [];
afterEach(async () => {
  await Promise.all(scratch.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});
async function fixture() {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'mio-delivery-')));
  scratch.push(root);
  for (const file of ['harness.config.json', 'docs/coordination.md', 'docs/work-records.md']) {
    await mkdir(dirname(join(root, file)), { recursive: true });
    await cp(join(project, file), join(root, file));
  }
  for (const [file, text] of Object.entries({
    'package.json': '{"type":"module"}\n',
    '.gitignore': '.work/\n',
    'AGENTS.md': '# Development\n',
    'docs/api.md': '# API\n',
    'docs/foundation.md': '# Foundation\n',
    'docs/acceptance.md': '# Acceptance\n',
    'docs/tasks/index.md': renderIndex({ version: 1, tasks: [] }),
    'src/value.ts': 'export const value = 1;\n',
  })) {
    await mkdir(dirname(join(root, file)), { recursive: true });
    await writeFile(join(root, file), text);
  }
  expect(spawnSync('git', ['init', '-q', '-b', 'main'], { cwd: root }).status).toBe(0);
  await initializeMember(root, 'alice');
  return root;
}
async function setup(root: string, id = 'probe') {
  const task = draft(root, 'alice', id, 'Implement a capability');
  Object.assign(task.plan, {
    scope: ['src', 'docs'],
    sources: ['docs/api.md'],
    authorization: 'Fixture user authorized implementation.',
    acceptance: [
      { id: 'checks', criterion: 'Capability returns 1.', method: 'automated' },
      { id: 'quality-review', criterion: 'Review the fixture source.', method: 'review' },
    ],
    nextAction: 'Verify',
    stopCondition: 'Return for acceptance',
  });
  task.checkpoint = await capture(root, task);
  task.stage = 'C0_READY';
  await saveTask(root, task);
  const initial = await loadTask(root, id);
  await deliver(root, id, json({ action: 'prepare', revision: digest(initial.raw) }));
  await passing(root, id);
}
async function passing(root: string, id = 'probe') {
  const { task, raw } = await loadTask(root, id);
  task.checkpoint = await capture(root, task);
  const artifact = `.work/tasks/${id}/evidence/checks.log`;
  await mkdir(dirname(join(root, artifact)), { recursive: true });
  await writeFile(join(root, artifact), 'Observed capability = 1\n');
  task.evidence.push({
    criterion: 'checks',
    method: 'automated',
    result: 'pass',
    candidate: task.checkpoint.candidate,
    artifact,
    sha256: digest('Observed capability = 1\n'),
    summary: 'Fixture observation',
    environment: 'isolated fixture',
  });
  const review = reviewMarkdown(reviewFixture(task.checkpoint.candidate));
  const reviewPath = `.work/tasks/${id}/evidence/review-${task.evidence.length}.md`;
  await writeFile(join(root, reviewPath), review);
  task.evidence.push({
    criterion: 'quality-review',
    method: 'review',
    result: 'pass',
    candidate: task.checkpoint.candidate,
    artifact: reviewPath,
    sha256: digest(review),
    summary: 'Fixture quality review',
    environment: 'isolated fixture',
  });
  task.stage = 'C1_EVIDENCE_PENDING';
  task.reviewDecision = 'PENDING';
  task.releaseDisposition = 'HOLD_FOR_EVIDENCE';
  await saveTask(root, task, raw);
}
async function prepareRequest(root: string, id = 'probe') {
  const { raw } = await loadTask(root, id);
  return {
    action: 'prepare',
    revision: digest(raw),
    title: 'Capability query',
    modules: ['capability'],
    outcomes: 'Returns the requested capability.',
    decisions: 'Use the existing API.',
    limitations: 'Fixture only.',
    evidence: [
      { criterion: 'checks', representation: 'original' },
      { criterion: 'quality-review', representation: 'original' },
    ],
  };
}
async function prepare(root: string, id = 'probe') {
  return deliver(root, id, json(await prepareRequest(root, id)));
}
async function completeRequest(root: string, id = 'probe') {
  const { task, raw } = await loadTask(root, id);
  return {
    action: 'complete',
    revision: digest(raw),
    draftSha256: task.delivery!.draft!.sha256,
    acceptance: {
      candidate: task.checkpoint!.candidate,
      statement: 'Fixture user accepts this exact result.',
      reference: 'Fixture acceptance transcript #1',
    },
  };
}
async function finish(root: string, id = 'probe') {
  await prepare(root, id);
  const request = await completeRequest(root, id);
  await deliver(root, id, json(request));
  return request;
}
function commit(root: string) {
  expect(spawnSync('git', ['add', '.'], { cwd: root }).status).toBe(0);
  const result = spawnSync(
    'git',
    [
      '-c',
      'user.name=Fixture',
      '-c',
      'user.email=fixture@example.test',
      'commit',
      '-qm',
      'accepted fixture',
    ],
    { cwd: root },
  );
  expect(result.status, result.stderr.toString()).toBe(0);
}

it('delivers only accepted results, preserves the candidate, and verifies public bytes without .work', async () => {
  const root = await fixture();
  await setup(root);
  const before = (await loadTask(root, 'probe')).task.checkpoint!.candidate;
  await prepare(root);
  const request = await completeRequest(root);
  await expect(
    deliver(root, 'probe', json({ ...request, acceptance: undefined })),
  ).rejects.toThrow();
  await expect(readFile(join(root, reportPath('probe')))).rejects.toThrow();
  await deliver(root, 'probe', json(request));
  await expect(readFile(join(root, reviewPath('probe')))).rejects.toThrow();
  expect(
    parseIndex(await readFile(join(root, indexPath), 'utf8')).tasks[0]!.review,
  ).toBeUndefined();
  expect((await loadTask(root, 'probe')).task.reviewDecision).toBe('ACCEPT');
  expect((await capture(root, (await loadTask(root, 'probe')).task)).candidate).toBe(before);
  expect(await deliver(root, 'probe', json(request))).toMatchObject({ replayed: true });
  const files = (await inventory(root, await loadConfig(root))).files;
  expect((await checkDocuments(root, files, await loadConfig(root))).errors).toEqual([]);
  const publicCopy = await fixture();
  await cp(join(root, 'docs/tasks'), join(publicCopy, 'docs/tasks'), { recursive: true });
  await rm(join(publicCopy, '.work'), { recursive: true });
  expect(
    await checkReports(
      publicCopy,
      (await inventory(publicCopy, await loadConfig(publicCopy))).files,
    ),
  ).toEqual([]);
});

it('publishes a reviewable pending package and reports the actual remaining acceptance condition', async () => {
  const root = await fixture();
  await setup(root);
  const candidate = (await loadTask(root, 'probe')).task.checkpoint!.candidate;
  const request = await prepareRequest(root);
  expect(await deliver(root, 'probe', json(request))).toMatchObject({
    readyForAcceptance: true,
    review: { path: reviewPath('probe'), candidate },
  });
  expect(await deliver(root, 'probe', json(request))).toMatchObject({ replayed: true });
  const loaded = await loadTask(root, 'probe');
  expect(loaded.task.releaseDisposition).toBe('HOLD_FOR_HUMAN_REVIEW');
  expect(loaded.task.reviewDecision).toBe('PENDING');
  expect(await assess(root, loaded.task)).toMatchObject({
    ready: true,
    readyForAcceptance: true,
    releaseDisposition: 'HOLD_FOR_HUMAN_REVIEW',
    candidate,
  });
  const status = spawnSync(
    process.execPath,
    [join(project, 'scripts/harness/work/cli.ts'), 'status'],
    { cwd: root, encoding: 'utf8' },
  );
  expect(status.status, status.stderr).toBe(0);
  expect(JSON.parse(status.stdout).tasks[0].assessment.readyForAcceptance).toBe(true);
  const index = parseIndex(await readFile(join(root, indexPath), 'utf8'));
  expect(index.tasks[0]).toMatchObject({ status: 'pending', review: { candidate } });
  expect(index.tasks[0]!.report).toBeUndefined();
  expect(
    parseReport(await readFile(join(root, reviewPath('probe')), 'utf8'), false).acceptance,
  ).toBeUndefined();
  const publicCopy = await fixture();
  await cp(join(root, 'docs/tasks'), join(publicCopy, 'docs/tasks'), { recursive: true });
  await rm(join(publicCopy, '.work'), { recursive: true });
  const files = (await inventory(publicCopy, await loadConfig(publicCopy))).files;
  expect(await checkReports(publicCopy, files)).toEqual([]);
  expect((await checkDocuments(publicCopy, files, await loadConfig(publicCopy))).errors).toEqual(
    [],
  );
  const attachment = join(root, 'docs/tasks/pending/probe/evidence/checks.md');
  await writeFile(attachment, 'Human edit must survive.');
  expect(await assess(root, loaded.task)).toMatchObject({
    readyForAcceptance: false,
    releaseDisposition: 'HOLD_FOR_EVIDENCE',
  });
  await expect(prepare(root)).rejects.toThrow('published review evidence changed');
  await expect(deliver(root, 'probe', json(await completeRequest(root)))).rejects.toThrow(
    'published review evidence changed',
  );
  expect(await readFile(attachment, 'utf8')).toBe('Human edit must survive.');
});

it('withdraws waiting-for-acceptance when a candidate, original, or draft attachment changes', async () => {
  const root = await fixture();
  await setup(root);
  await prepare(root);
  const { task } = await loadTask(root, 'probe');
  const file = join(root, 'src/value.ts');
  const original = await readFile(file, 'utf8');
  await writeFile(file, 'export const value = 2;\n');
  expect(await assess(root, task)).toMatchObject({
    ready: false,
    readyForAcceptance: false,
    releaseDisposition: 'HOLD_FOR_EVIDENCE',
  });
  await writeFile(file, original);
  const log = join(root, '.work/tasks/probe/evidence/checks.log');
  const logBefore = await readFile(log, 'utf8');
  await writeFile(log, 'corrupt');
  expect((await assess(root, task)).readyForAcceptance).toBe(false);
  await writeFile(log, logBefore);
  await writeFile(join(root, '.work/tasks/probe/delivery/evidence/checks.md'), 'corrupt');
  expect(await assess(root, task)).toMatchObject({
    readyForAcceptance: false,
    draftIssue: expect.stringContaining('draft attachment changed'),
  });
});

it.each([0, 1, 2, 3, 4, 5, 6, 7, 8])(
  'recovers preparation interrupted after %i writes',
  async (cut) => {
    const root = await fixture();
    await setup(root);
    const request = await prepareRequest(root);
    await deliver(root, 'probe', json(request));
    const op = (await loadOperation(root, 'probe'))!;
    expect(op.kind).toBe('prepare');
    expect(op.changes).toHaveLength(8);
    op.done = false;
    for (let i = 0; i < op.changes.length; i++) {
      const change = op.changes[i]!;
      const value = i < cut ? change.after : change.before;
      if (value === null) await rm(join(root, change.path), { force: true });
      else await writeFile(join(root, change.path), value);
    }
    await writeFile(join(root, operationPath('probe')), json(op));
    expect(await assess(root, (await loadTask(root, 'probe')).task)).toMatchObject({
      ready: false,
      readyForAcceptance: false,
      errors: expect.arrayContaining([expect.stringContaining('WORK_DELIVERY_PENDING')]),
    });
    const beforeReplay = spawnSync(
      process.execPath,
      [join(project, 'scripts/harness/work/cli.ts'), 'status'],
      { cwd: root, encoding: 'utf8' },
    );
    expect(JSON.parse(beforeReplay.stdout).tasks[0].assessment.readyForAcceptance).toBe(false);
    const result = spawnSync(
      process.execPath,
      [join(project, 'scripts/harness/work/cli.ts'), 'deliver', 'probe', '--stdin'],
      { cwd: root, input: json(request), encoding: 'utf8' },
    );
    expect(result.status, result.stderr).toBe(0);
    expect((await loadOperation(root, 'probe'))!.done).toBe(true);
    expect((await assess(root, (await loadTask(root, 'probe')).task)).readyForAcceptance).toBe(
      true,
    );
    expect(parseIndex(await readFile(join(root, indexPath), 'utf8')).tasks).toHaveLength(1);
    await expect(readFile(join(root, reportPath('probe')))).rejects.toThrow();
  },
);

it('refuses stale candidate, modified draft, damaged evidence and missing acceptance binding', async () => {
  const root = await fixture();
  await setup(root);
  await prepare(root);
  const request = await completeRequest(root);
  await expect(
    deliver(
      root,
      'probe',
      json({ ...request, acceptance: { ...request.acceptance, candidate: 'a'.repeat(64) } }),
    ),
  ).rejects.toThrow('candidate mismatch');
  const draftPath = join(root, '.work/tasks/probe/delivery/draft.md');
  const bytes = await readFile(draftPath, 'utf8');
  await writeFile(draftPath, bytes + 'edited');
  await expect(deliver(root, 'probe', json(request))).rejects.toThrow('draft bytes');
  await writeFile(draftPath, bytes);
  await writeFile(join(root, 'src/value.ts'), 'export const value = 2;');
  await expect(deliver(root, 'probe', json(request))).rejects.toThrow('WORK_CONTEXT_CHANGED');
  await writeFile(join(root, 'src/value.ts'), 'export const value = 1;\n');
  await writeFile(join(root, '.work/tasks/probe/evidence/checks.log'), 'damaged');
  await expect(deliver(root, 'probe', json(request))).rejects.toThrow('WORK_DELIVERY_EVIDENCE');
});

it('reopens without overwriting the old report, requires recoverable history, and accepts a new candidate', async () => {
  const root = await fixture();
  await setup(root);
  await finish(root);
  const old = await readFile(join(root, reportPath('probe')), 'utf8');
  let state = await loadTask(root, 'probe');
  await updateTask(
    root,
    'probe',
    json({
      revision: digest(state.raw),
      reason: 'Fixture requests repair.',
      reopen: true,
      plan: { authorization: 'Fixture user requests repair.' },
    }),
  );
  expect(parseIndex(await readFile(join(root, indexPath), 'utf8')).tasks[0]!.status).toBe(
    'reopened',
  );
  expect(await readFile(join(root, reportPath('probe')), 'utf8')).toBe(old);
  expect((await loadTask(root, 'probe')).task.reviewDecision).toBe('PENDING');
  await passing(root);
  await prepare(root);
  await expect(deliver(root, 'probe', json(await completeRequest(root)))).rejects.toThrow(
    'WORK_DELIVERY_HISTORY',
  );
  commit(root);
  const oldCommit = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  }).stdout.trim();
  await writeFile(join(root, 'src/value.ts'), 'export const value = 2;\n');
  await passing(root);
  await finish(root);
  expect(
    spawnSync('git', ['show', `${oldCommit}:${reportPath('probe')}`], {
      cwd: root,
      encoding: 'utf8',
    }).stdout,
  ).toBe(old);
  state = await loadTask(root, 'probe');
  expect(state.task.delivery!.accepted!.candidate).not.toBe(parseReport(old).checkpoint.candidate);
});

it('receives accepted history with changed code as a new local draft without authority or passing evidence', async () => {
  const sender = await fixture();
  await setup(sender);
  await finish(sender);
  const receiver = await fixture();
  await cp(join(sender, 'docs/tasks'), join(receiver, 'docs/tasks'), { recursive: true });
  await writeFile(join(receiver, 'src/value.ts'), 'export const value = 99;\n');
  const task = await receive(receiver, reportPath('probe'));
  expect(task.plan.authorization).toBe('');
  expect(task.evidence).toEqual([]);
  expect(task.reviewDecision).toBe('PENDING');
  expect(task.checkpoint).toBeNull();
  expect(task.notes.join(' ')).toContain('src/value.ts');
  const loaded = await loadTask(receiver, 'probe');
  await updateTask(
    receiver,
    'probe',
    json({
      revision: digest(loaded.raw),
      reason: 'Receiver requests repair.',
      reopen: true,
      plan: { authorization: 'Fixture receiver is authorized to repair.' },
    }),
  );
  expect(parseIndex(await readFile(join(receiver, indexPath), 'utf8')).tasks[0]!.status).toBe(
    'reopened',
  );
  expect((await loadTask(receiver, 'probe')).task.checkpoint).toBeNull();
  await expect(receive(receiver, reportPath('probe'))).rejects.toThrow();
});

it.each([0, 1, 2, 3, 4, 5, 6, 7, 8])(
  'recovers a delivery interrupted after %i target writes without duplicate output',
  async (cut) => {
    const root = await fixture();
    await setup(root);
    const request = await finish(root);
    const op = (await loadOperation(root, 'probe'))!;
    // Reconstruct the persisted state at each actual journal boundary, then replay the real command.
    op.done = false;
    for (let i = 0; i < op.changes.length; i++) {
      const change = op.changes[i]!;
      const value = i < cut ? change.after : change.before;
      if (value === null) await rm(join(root, change.path), { force: true });
      else await writeFile(join(root, change.path), value);
    }
    await writeFile(join(root, operationPath('probe')), json(op));
    await mkdir(join(root, '.work/tasks/probe/delivery/staged'), { recursive: true });
    await writeFile(
      join(root, '.work/tasks/probe/delivery/staged/interrupted.tmp'),
      'unfinished temporary bytes',
    );
    const result = spawnSync(
      process.execPath,
      [join(project, 'scripts/harness/work/cli.ts'), 'deliver', 'probe', '--stdin'],
      { cwd: root, input: json(request), encoding: 'utf8' },
    );
    expect(result.status, result.stderr).toBe(0);
    expect((await loadOperation(root, 'probe'))!.done).toBe(true);
    expect(parseIndex(await readFile(join(root, indexPath), 'utf8')).tasks).toHaveLength(1);
    expect((await assess(root, (await loadTask(root, 'probe')).task)).ready).toBe(true);
  },
);

it('preserves concurrent edits and refuses other writes while a delivery is pending', async () => {
  const root = await fixture();
  await setup(root);
  const request = await finish(root);
  const op = (await loadOperation(root, 'probe'))!;
  op.done = false;
  const last = op.changes.at(-1)!;
  await writeFile(join(root, last.path), last.before!);
  await writeFile(join(root, operationPath('probe')), json(op));
  const manual = (await readFile(join(root, indexPath), 'utf8')) + '\nHuman note.\n';
  await writeFile(join(root, indexPath), manual);
  await expect(deliver(root, 'probe', json(request))).rejects.toThrow('WORK_DELIVERY_CONFLICT');
  const current = await loadTask(root, 'probe');
  await expect(saveTask(root, current.task, current.raw)).rejects.toThrow('WORK_DELIVERY_PENDING');
  expect(await readFile(join(root, indexPath), 'utf8')).toBe(manual);
});

it('keeps delivery candidate classification across the existing exact-code handoff', async () => {
  const sender = await fixture();
  await setup(sender);
  await finish(sender);
  const receiver = await fixture();
  await cp(join(sender, 'docs/tasks'), join(receiver, 'docs/tasks'), { recursive: true });
  const portable = await handoff(sender, (await loadTask(sender, 'probe')).task);
  await mkdir(join(receiver, '.work/inbox'), { recursive: true });
  await cp(portable, join(receiver, '.work/inbox/task.md'));
  const task = await receive(receiver, '.work/inbox/task.md');
  expect(task.delivery).toEqual({ version: 1 });
  expect(task.evidence).toEqual([]);
  expect(task.plan.authorization).toBe('');
});

it('still binds other task reports and ordinary docs, and rejects orphaned or altered public evidence', async () => {
  const root = await fixture();
  await setup(root, 'first');
  await finish(root, 'first');
  await setup(root, 'second');
  const before = (await loadTask(root, 'second')).task.checkpoint!.candidate;
  await writeFile(
    join(root, reportPath('first')),
    (await readFile(join(root, reportPath('first')), 'utf8')) + 'changed',
  );
  expect((await capture(root, (await loadTask(root, 'second')).task)).candidate).not.toBe(before);
  expect(
    await checkReports(root, (await inventory(root, await loadConfig(root))).files),
  ).not.toEqual([]);
});

it('uses canonical Markdown for generated public files', async () => {
  const root = await fixture();
  await setup(root);
  await finish(root);
  for (const path of [
    indexPath,
    reportPath('probe'),
    'docs/tasks/complete/probe/evidence/checks.md',
  ]) {
    const source = await readFile(join(root, path), 'utf8');
    expect(await markdown(source)).toBe(source);
  }
});

it('does not replay copied private operation records in another workspace', async () => {
  const a = await fixture();
  await setup(a);
  const request = await finish(a);
  const b = await fixture();
  await cp(join(a, 'docs/tasks'), join(b, 'docs/tasks'), { recursive: true });
  await rm(join(b, '.work'), { recursive: true });
  await cp(join(a, '.work'), join(b, '.work'), { recursive: true });
  await expect(deliver(b, 'probe', json(request))).rejects.toThrow('WORK_OWNER');
});

it('does not rewrite a completed output that a person restored to its previous bytes', async () => {
  const root = await fixture();
  await setup(root);
  const request = await finish(root);
  const operation = (await loadOperation(root, 'probe'))!;
  const index = operation.changes.find((change) => change.path === indexPath)!;
  await writeFile(join(root, indexPath), index.before!);
  await expect(deliver(root, 'probe', json(request))).rejects.toThrow('completed output changed');
  expect(await readFile(join(root, indexPath), 'utf8')).toBe(index.before);
});

it('rejects delivery for a legacy task with no public source before publishing invalid index data', async () => {
  const root = await fixture();
  await setup(root);
  const loaded = await loadTask(root, 'probe');
  loaded.task.plan.sources = [];
  await saveTask(root, loaded.task, loaded.raw);
  await passing(root);
  await expect(prepare(root)).rejects.toThrow('WORK_DELIVERY_SOURCE');
  await expect(readFile(join(root, reportPath('probe')))).rejects.toThrow();
});
