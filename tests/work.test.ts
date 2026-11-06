import { spawn, spawnSync } from 'node:child_process';
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import type { Task } from '../scripts/harness/work/records.ts';
import { reviewFixture, reviewMarkdown } from './quality-review-fixture.ts';

const project = resolve('.');
const cli = join(project, 'scripts/harness/work/cli.ts');
const scratch: string[] = [];
afterEach(async () => {
  await Promise.all(scratch.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

async function fixture(actor = 'alice') {
  const root = await mkdtemp(join(tmpdir(), 'mio-work-'));
  scratch.push(root);
  await cp(join(project, 'harness.config.json'), join(root, 'harness.config.json'));
  for (const [file, source] of Object.entries({
    'package.json': '{"type":"module"}\n',
    '.gitignore': '.work/\n',
    'AGENTS.md': '# Development\n',
    'docs/api.md': '# API\n',
    'src/value.ts': 'export const value = 1;\n',
  })) {
    await mkdir(dirname(join(root, file)), { recursive: true });
    await writeFile(join(root, file), source);
  }
  for (const file of ['docs/coordination.md', 'docs/work-records.md'])
    await cp(join(project, file), join(root, file));
  expect(spawnSync('git', ['init', '-q', '-b', 'main'], { cwd: root }).status).toBe(0);
  expect(invoke(root, ['init', actor]).status).toBe(0);
  return root;
}

// The child has no Skill paths, Codex tools or conversation history; all behavior enters the real CLI.
function invoke(root: string, args: string[], input?: unknown) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { PATH: process.env.PATH ?? '' },
    timeout: 10000,
    ...(input === undefined ? {} : { input: JSON.stringify(input) }),
  });
  return { status: result.status, output: `${result.stdout}\n${result.stderr}`.trim() };
}

const statePath = (root: string, id = 'probe') => join(root, `.work/tasks/${id}/state.json`);
const state = async (root: string, id = 'probe'): Promise<Task> =>
  JSON.parse(await readFile(statePath(root, id), 'utf8'));
async function edit(root: string, change: (task: Task) => void, id = 'probe') {
  const task = await state(root, id);
  change(task);
  await writeFile(statePath(root, id), JSON.stringify(task));
}

async function ready(root: string, id = 'probe') {
  expect(invoke(root, ['start', id, 'Verify the probe', 'docs/api.md']).status).toBe(0);
  const revision = JSON.parse(invoke(root, ['context', id, 'resume']).output).revision;
  const updated = invoke(root, ['update', id, '--stdin'], {
    revision,
    reason: 'Derived the probe contract from the fixture user request.',
    plan: {
      scope: ['src'],
      authorization: 'Fixture user requests local probe implementation and checks.',
      acceptance: [{ id: 'checks', criterion: 'The probe check passes.', method: 'automated' }],
      nextAction: 'Implement and check the probe.',
      stopCondition: 'Return verified results for review.',
    },
  });
  expect(updated.status, updated.output).toBe(0);
  const result = invoke(root, ['sync', id, 'Read the contract and inspected the baseline.']);
  expect(result.status, result.output).toBe(0);
}

function run(root: string, script = 'console.log("observed probe")', id = 'probe') {
  return invoke(root, ['run', id, 'checks', '--', process.execPath, '-e', script]);
}

async function accept(root: string) {
  const current = await state(root);
  const relative = `.work/tasks/probe/evidence/review-${current.evidence.length}.md`;
  await mkdir(dirname(join(root, relative)), { recursive: true });
  await writeFile(
    join(root, relative),
    reviewMarkdown(reviewFixture(current.checkpoint!.candidate)),
  );
  expect(
    invoke(root, ['evidence', 'probe', 'quality-review', 'pass', relative, 'Fixture review.'])
      .status,
  ).toBe(0);
  await edit(root, (task) => {
    task.stage = 'C1_RELEASED';
    task.reviewDecision = 'ACCEPT';
    task.releaseDisposition = 'RELEASED';
  });
}

it('initializes without Skills, retains existing records and refuses another member or duplicate task', async () => {
  const root = await fixture();
  await mkdir(join(root, '.work/evidence'));
  await writeFile(join(root, '.work/evidence/legacy.log'), 'original failure');
  await ready(root);
  const original = await readFile(statePath(root), 'utf8');
  expect(invoke(root, ['init', 'alice']).status).toBe(0);
  expect(invoke(root, ['init', 'bob']).output).toContain('WORK_MEMBER');
  expect(invoke(root, ['start', 'probe', 'Replacement']).status).toBe(1);
  expect(await readFile(statePath(root), 'utf8')).toBe(original);
  expect(await readFile(join(root, '.work/evidence/legacy.log'), 'utf8')).toBe('original failure');
});

const requirement = { source: 'docs/api.md', section: 'API', key: 'value-probe' };
function proposal() {
  return {
    requirement,
    plan: {
      goal: 'Implement the PRD value subtask.',
      scope: ['src'],
      authorization: 'Fixture user requests this PRD subtask and local validation.',
      acceptance: [{ id: 'checks', criterion: 'The value is 2.', method: 'automated' }],
      nonGoals: ['No remote operations.'],
      nextAction: 'Implement the value subtask.',
      stopCondition: 'Return results for human review.',
    },
  };
}

it('bootstraps one complete member record when independent subtasks start concurrently', async () => {
  const root = await fixture();
  await rm(join(root, '.work'), { recursive: true });
  const pending = Array.from({ length: 12 }, (_, index) => {
    const child = spawn(process.execPath, [cli, 'ensure', '--stdin'], {
      cwd: root,
      env: { PATH: process.env.PATH ?? '' },
      timeout: 10000,
    });
    let output = '';
    child.stdout.on('data', (bytes: Buffer) => (output += bytes.toString()));
    child.stderr.on('data', (bytes: Buffer) => (output += bytes.toString()));
    const result = new Promise<{ status: number | null; output: string }>((resolve, reject) => {
      child.on('error', reject);
      child.on('close', (status) => resolve({ status, output }));
    });
    return { child, result, key: `parallel-${index}` };
  });
  for (const { child, key } of pending)
    child.stdin.end(JSON.stringify({ ...proposal(), requirement: { ...requirement, key } }));
  const results = await Promise.all(pending.map(({ result }) => result));
  for (const result of results) expect(result.status, result.output).toBe(0);
  const member = JSON.parse(await readFile(join(root, '.work/member.json'), 'utf8'));
  expect(member.workspace).toBe(await realpath(root));
  expect(await readdir(join(root, '.work'))).toEqual(['member.json', 'tasks']);
  expect(await readdir(join(root, '.work/tasks'))).toHaveLength(12);
  for (const result of results) {
    const id = JSON.parse(result.output).task.id as string;
    expect((await state(root, id)).member).toBe(member.member);
  }
});

it('automatically creates a PRD subtask and resumes it after interruption without replacing progress or evidence', async () => {
  const root = await fixture();
  await rm(join(root, '.work'), { recursive: true });
  expect(JSON.parse(invoke(root, ['status']).output)).toEqual({ tasks: [] });
  await expect(readdir(join(root, '.work'))).rejects.toHaveProperty('code', 'ENOENT');
  const first = invoke(root, ['ensure', '--stdin'], proposal());
  expect(first.status, first.output).toBe(0);
  const created = JSON.parse(first.output);
  const id = created.task.id as string;
  expect(created.created).toBe(true);
  expect(created.assessment.ready).toBe(true);
  expect(created.task.requirement).toEqual(requirement);
  expect(JSON.parse(invoke(root, ['status']).output).tasks[0].requirement).toEqual(requirement);
  expect((await state(root, id)).member).toMatch(/^local-/);
  expect(invoke(root, ['ensure', '--stdin'], proposal()).output).toContain('"created": false');
  const implementing = invoke(root, ['update', id, '--stdin'], {
    revision: created.revision,
    reason: 'Started the authorized PRD subtask.',
    stage: 'C1_IMPLEMENTATION',
  });
  expect(implementing.status, implementing.output).toBe(0);
  const script =
    'require("node:assert/strict").equal(require("node:fs").readFileSync("src/value.ts", "utf8"), "export const value = 2;\\n")';
  expect(run(root, script, id).status).toBe(1);
  const beforePause = JSON.parse(invoke(root, ['context', id, 'resume']).output);
  expect(
    invoke(root, ['update', id, '--stdin'], {
      revision: beforePause.revision,
      reason: 'Interrupted after observing the original failing value.',
      plan: { nextAction: 'Change value to 2, then rerun the same criterion.' },
    }).status,
  ).toBe(0);
  const saved = await readFile(statePath(root, id), 'utf8');
  const resumed = invoke(root, ['ensure', '--stdin'], { requirement });
  expect(resumed.status, resumed.output).toBe(0);
  const continuation = JSON.parse(resumed.output);
  expect(continuation.task.id).toBe(id);
  expect(continuation.task.nextAction).toContain('Change value to 2');
  expect(continuation.revision).not.toBe(beforePause.revision);
  expect(await readFile(statePath(root, id), 'utf8')).toBe(saved);
  expect(invoke(root, ['ensure', '--stdin'], proposal()).output).toContain('WORK_CONFLICT');
  await writeFile(join(root, 'src/value.ts'), 'export const value = 2;\n');
  const stale = JSON.parse(invoke(root, ['ensure', '--stdin'], { requirement }).output);
  expect(stale.assessment.ready).toBe(false);
  expect(stale.assessment.errors.join()).toContain('WORK_CONTEXT_CHANGED');
  expect(await readFile(statePath(root, id), 'utf8')).toBe(saved);
  expect(
    invoke(root, ['sync', id, 'Reviewed the value change against the PRD subtask.']).status,
  ).toBe(0);
  expect(run(root, script, id).status).toBe(0);
  const final = await state(root, id);
  expect(final.evidence.map((entry) => entry.result)).toEqual(['fail', 'pass']);
  expect(final.reviewDecision).toBe('PENDING');
  expect(final.evidence[0]!.candidate).not.toBe(final.evidence[1]!.candidate);
  expect(await readdir(join(root, '.work/tasks'))).toEqual([id]);
  expect(
    invoke(root, ['ensure', '--stdin'], {
      requirement: { ...requirement, key: 'unknown-subtask' },
    }).output,
  ).toContain('new tasks require plan.goal');
  expect(await readdir(join(root, '.work/tasks'))).toEqual([id]);
});

it('rejects stale structured updates, protected fields and invalid contracts without altering the original record', async () => {
  const root = await fixture();
  await ready(root);
  const context = JSON.parse(invoke(root, ['context', 'probe', 'resume']).output);
  const request = { revision: context.revision, reason: 'Update the verified next action.' };
  expect(
    invoke(root, ['update', 'probe', '--stdin'], { ...request, plan: { nextAction: 'Next.' } })
      .status,
  ).toBe(0);
  const saved = await readFile(statePath(root), 'utf8');
  expect(invoke(root, ['update', 'probe', '--stdin'], request).output).toContain('WORK_CONFLICT');
  const revision = JSON.parse(invoke(root, ['context', 'probe', 'resume']).output).revision;
  for (const patch of [
    { evidence: [] },
    { member: 'bob' },
    { checkpoint: null },
    { reviewDecision: 'ACCEPT' },
    { releaseDisposition: 'RELEASED' },
    { stage: 'C1_RELEASED' },
    { plan: { id: 'new-id' } },
    { plan: { requirement } },
    { plan: null },
    { plan: { acceptance: [{ id: 'bad', criterion: 'Bad', method: 'unknown' }] } },
  ]) {
    expect(
      invoke(root, ['update', 'probe', '--stdin'], { ...request, revision, ...patch }).status,
    ).toBe(1);
    expect(await readFile(statePath(root), 'utf8')).toBe(saved);
  }
});

it('invalidates release on structured contract changes while preserving old evidence and requiring sync', async () => {
  const root = await fixture();
  await ready(root);
  expect(run(root).status).toBe(0);
  await accept(root);
  const original = await state(root);
  const current = JSON.parse(invoke(root, ['context', 'probe', 'resume']).output);
  const progress = JSON.parse(
    invoke(root, ['update', 'probe', '--stdin'], {
      revision: current.revision,
      reason: 'Only the next action changed.',
      plan: { nextAction: 'Wait for the next user instruction.' },
    }).output,
  );
  expect(progress.assessment.ready).toBe(true);
  expect((await state(root)).releaseDisposition).toBe('RELEASED');
  const changed = invoke(root, ['update', 'probe', '--stdin'], {
    revision: progress.revision,
    reason: 'User changed the required criterion.',
    plan: {
      acceptance: [{ id: 'checks', criterion: 'A new required result.', method: 'automated' }],
    },
  });
  expect(changed.status, changed.output).toBe(0);
  const task = await state(root);
  expect(task.stage).toBe('C1_EVIDENCE_PENDING');
  expect(task.reviewDecision).toBe('PENDING');
  expect(task.evidence).toEqual(original.evidence);
  expect(task.checkpoint).toEqual(original.checkpoint);
  expect(JSON.parse(changed.output).assessment.errors.join()).toContain('WORK_CONTEXT_CHANGED');
  expect(invoke(root, ['sync', 'probe', 'Reconciled the new acceptance target.']).status).toBe(0);
  expect(JSON.parse(invoke(root, ['check', 'probe']).output).evidence[0].result).toBe('pending');
});

it('keeps PRD source binding and requires explicit current authorization to reopen archived work', async () => {
  const root = await fixture();
  const result = JSON.parse(invoke(root, ['ensure', '--stdin'], proposal()).output);
  const id = result.task.id as string;
  expect((await state(root, id)).checkpoint!.files).toHaveProperty('docs/api.md');
  expect(invoke(root, ['archive', id, 'Paused by user.']).status).toBe(0);
  const archived = JSON.parse(invoke(root, ['ensure', '--stdin'], { requirement }).output);
  expect(archived.task.archived).toBe(true);
  const request = {
    revision: archived.revision,
    reason: 'User requests this subtask again.',
    reopen: true,
  };
  expect(invoke(root, ['update', id, '--stdin'], request).output).toContain('reopening requires');
  expect(
    invoke(root, ['update', id, '--stdin'], {
      ...request,
      plan: { authorization: 'Current user explicitly requests resuming this subtask.' },
    }).status,
  ).toBe(0);
  expect((await state(root, id)).archived).toBe(false);
  expect(invoke(root, ['check', id]).output).toContain('WORK_CONTEXT_CHANGED');
  expect(invoke(root, ['sync', id, 'Reconciled the new authorization.']).status).toBe(0);
  await writeFile(join(root, 'docs/api.md'), '# API\nUpdated PRD contract.\n');
  expect(invoke(root, ['check', id]).output).toContain('WORK_CONTEXT_CHANGED');
  const original = await readFile(statePath(root, id), 'utf8');
  expect(
    invoke(root, ['ensure', '--stdin'], { requirement: { ...requirement, section: 'Other' } })
      .output,
  ).toContain('WORK_CONFLICT');
  expect(await readFile(statePath(root, id), 'utf8')).toBe(original);
  expect(
    invoke(root, ['ensure', '--stdin'], {
      ...proposal(),
      requirement: { ...requirement, source: '.work/private.md' },
    }).output,
  ).toContain('WORK_PRIVATE');
});

it('preserves requirement identity across handoff while clearing recipient authority and evidence', async () => {
  const sender = await fixture();
  const first = JSON.parse(invoke(sender, ['ensure', '--stdin'], proposal()).output);
  const id = first.task.id as string;
  const portable = invoke(sender, ['handoff', id]);
  expect(portable.status, portable.output).toBe(0);
  const receiver = await fixture('bob');
  await mkdir(join(receiver, '.work/inbox'));
  await cp(portable.output, join(receiver, '.work/inbox/task.md'));
  expect(invoke(receiver, ['receive', '.work/inbox/task.md']).status).toBe(0);
  const resumed = JSON.parse(invoke(receiver, ['ensure', '--stdin'], { requirement }).output);
  expect(resumed.created).toBe(false);
  expect(resumed.task.id).toBe(id);
  expect(resumed.task.requirement).toEqual(requirement);
  expect(resumed.task.authorization).toBe('');
  expect(resumed.assessment.ready).toBe(false);
  expect((await state(receiver, id)).evidence).toEqual([]);
});

it('offers start guidance without personal records and returns only the selected action', async () => {
  const root = await fixture();
  await rm(join(root, '.work'), { recursive: true });
  const start = invoke(root, ['guide', 'start']);
  expect(start.status, start.output).toBe(0);
  expect(JSON.parse(start.output).reading.map((item: { ref: string }) => item.ref)).toEqual([
    'docs/coordination.md#共同规则',
    'docs/coordination.md#开始任务',
    'docs/work-records.md#创建任务',
  ]);
  expect(start.output).not.toContain('## 跨人交接');
  expect(start.output).not.toContain('## 记录结构');
  const before = start.output;
  await writeFile(
    join(root, 'docs/coordination.md'),
    (await readFile(join(root, 'docs/coordination.md'), 'utf8')) +
      '\n## 无关模式\nunrelated newly added mode\n',
  );
  expect(invoke(root, ['guide', 'start']).output).toBe(before);
  expect(invoke(root, ['guide', 'constructor']).output).toContain('WORK_ACTION');
});

it('does not interpret example headings as guide sections and rejects absent or duplicate routing targets', async () => {
  const root = await fixture();
  const path = join(root, 'docs/coordination.md');
  await writeFile(
    path,
    '# Guide\n## 共同规则\nPreserve common obligations.\n## 开始任务\nCurrent task.\n```md\n## example heading\n```\n## 跨人交接\nforeign-mode-marker\n',
  );
  const result = invoke(root, ['guide', 'start']);
  expect(result.status).toBe(0);
  expect(result.output).toContain('example heading');
  expect(result.output).not.toContain('foreign-mode-marker');
  await writeFile(path, '# Missing route\n');
  expect(invoke(root, ['guide', 'start']).output).toContain('WORK_GUIDE_SECTION');
  await writeFile(path, '## 共同规则\none\n## 共同规则\ntwo\n');
  expect(invoke(root, ['guide', 'start']).output).toContain('WORK_GUIDE_SECTION');
});

it('resumes from current facts without returning history/raw logs and keeps older records readable', async () => {
  const root = await fixture();
  await ready(root);
  expect(run(root, 'console.log("raw-log-marker")').status).toBe(0);
  await edit(root, (task) => {
    task.notes = ['historical-note-marker'];
    task.plan.sources.push('AGENTS.md', 'docs/coordination.md', 'docs/work-records.md');
  });
  expect(invoke(root, ['sync', 'probe', 'Old default source list retained.']).status).toBe(0);
  const before = await readFile(statePath(root), 'utf8');
  const output = invoke(root, ['context', 'probe', 'resume']);
  expect(output.status, output.output).toBe(0);
  const result = JSON.parse(output.output);
  expect(result.task.authorization).toBe((await state(root)).plan.authorization);
  expect(result.task.goal).toBe((await state(root)).plan.goal);
  expect(result.reading.map((item: { ref: string }) => item.ref)).toEqual([
    'docs/coordination.md#共同规则',
    'docs/coordination.md#恢复与同步',
    'docs/work-records.md#核对与同步',
  ]);
  expect(output.output).not.toContain('historical-note-marker');
  expect(output.output).not.toContain('raw-log-marker');
  expect(output.output).not.toContain('## 发送与接收');
  expect(await readFile(statePath(root), 'utf8')).toBe(before);
  await edit(root, (task) => {
    task.plan.inputs.push('missing.ts');
  });
  const blocked = JSON.parse(invoke(root, ['context', 'probe', 'resume']).output);
  expect(blocked.assessment.ready).toBe(false);
  expect(blocked.task.goal).toBe(result.task.goal);
});

it.each(['start', 'resume', 'implement', 'verify', 'deliver', 'handoff', 'archive'])(
  'can resolve the real documentation for %s',
  async (action) => {
    const root = await fixture();
    const result = invoke(root, ['guide', action]);
    expect(result.status, result.output).toBe(0);
    expect(JSON.parse(result.output).reading[0].ref).toBe('docs/coordination.md#共同规则');
  },
);

it('preserves current decision authority and blocking reasons in progressive summaries', async () => {
  const root = await fixture();
  await ready(root);
  await edit(root, (task) => {
    task.plan.decisions = [
      { status: 'CONFIRMED', text: 'Preserve caller identity.', source: 'Current human contract' },
      { status: 'AI_PROPOSED', text: 'Optional implementation idea.', source: 'Agent proposal' },
    ];
  });
  expect(
    invoke(root, [
      'sync',
      'probe',
      'Read the confirmed decision and retained the proposal as a proposal.',
    ]).status,
  ).toBe(0);
  const current = JSON.parse(invoke(root, ['context', 'probe', 'implement']).output);
  expect(current.task.decisions).toEqual((await state(root)).plan.decisions);
  await edit(root, (task) => {
    task.plan.decisions.push({
      status: 'OPEN',
      text: 'Choose the shared contract.',
      source: 'Unresolved human decision',
    });
  });
  const blocked = JSON.parse(invoke(root, ['context', 'probe', 'resume']).output);
  expect(blocked.assessment.ready).toBe(false);
  expect(blocked.task.decisions.at(-1)).toEqual({
    status: 'OPEN',
    text: 'Choose the shared contract.',
    source: 'Unresolved human decision',
  });
  expect(blocked.task.reviewDecision).toBe('PENDING');
  expect(blocked.task.archived).toBe(false);
});

it('requires a real task contract and never treats a fresh draft or passing check as human acceptance', async () => {
  const root = await fixture();
  expect(invoke(root, ['start', 'draft', 'A goal']).status).toBe(0);
  const before = await readFile(statePath(root, 'draft'), 'utf8');
  expect(invoke(root, ['check', 'draft']).output).toContain('WORK_CONTRACT');
  expect(await readFile(statePath(root, 'draft'), 'utf8')).toBe(before);
  await ready(root);
  expect((await state(root)).stage).toBe('C0_READY');
  await accept(root);
  expect(invoke(root, ['check', 'probe']).output).toContain('WORK_RELEASE');
  await edit(root, (task) => {
    task.stage = 'C1_IMPLEMENTATION';
    task.releaseDisposition = 'HOLD_FOR_EVIDENCE';
    task.reviewDecision = 'PENDING';
  });
  expect(run(root).status).toBe(0);
  expect((await state(root)).reviewDecision).toBe('PENDING');
  await accept(root);
  expect(invoke(root, ['check', 'probe']).status).toBe(0);
});

it('preserves failed raw evidence and records the actual success separately', async () => {
  const root = await fixture();
  await ready(root);
  expect(run(root, 'console.error("original failure");process.exit(7)').status).toBe(1);
  expect(run(root).status).toBe(0);
  const task = await state(root);
  expect(task.evidence.map((entry) => entry.result)).toEqual(['fail', 'pass']);
  expect(task.evidence[0]!.artifact).not.toBe(task.evidence[1]!.artifact);
  expect(await readFile(join(root, task.evidence[0]!.artifact), 'utf8')).toContain(
    'original failure',
  );
  expect(JSON.parse(invoke(root, ['check', 'probe']).output).evidence[0].result).toBe('pass');
});

it('detects changed child documents read-only, rejects execution, and retains stale evidence after reconciliation', async () => {
  const root = await fixture();
  await ready(root);
  expect(run(root).status).toBe(0);
  await accept(root);
  await writeFile(join(root, 'docs/api.md'), '# Changed API contract\n');
  const before = await readFile(statePath(root), 'utf8');
  const check = invoke(root, ['check', 'probe']);
  expect(check.status).toBe(1);
  expect(check.output).toContain('docs/api.md');
  expect(await readFile(statePath(root), 'utf8')).toBe(before);
  expect(run(root).output).toContain('WORK_CONTEXT_CHANGED');
  expect(invoke(root, ['sync', 'probe', 'Read changed API and rechecked its impact.']).status).toBe(
    0,
  );
  const task = await state(root);
  expect(task.evidence).toHaveLength(2);
  expect(task.stage).toBe('C1_EVIDENCE_PENDING');
  expect(task.reviewDecision).toBe('PENDING');
  expect(JSON.parse(invoke(root, ['check', 'probe']).output).evidence[0].result).toBe('pending');
  expect(run(root).status).toBe(0);
});

it('captures new untracked scoped files and fails an otherwise successful check that changes its own input', async () => {
  const root = await fixture();
  await ready(root);
  await writeFile(join(root, 'src/new.ts'), 'export const next = 2;');
  expect(invoke(root, ['check', 'probe']).output).toContain('src/new.ts');
  expect(invoke(root, ['sync', 'probe', 'Reviewed the new source.']).status).toBe(0);
  const outcome = run(
    root,
    'require("node:fs").writeFileSync("src/value.ts", "export const value = 3;")',
  );
  expect(outcome.status).toBe(1);
  expect(outcome.output).toContain('WORK_CONTEXT_CHANGED');
  expect((await state(root)).evidence[0]!.result).toBe('pending');
});

it('binds evidence to acceptance changes while allowing next-action updates without a new candidate', async () => {
  const root = await fixture();
  await ready(root);
  expect(run(root).status).toBe(0);
  await edit(root, (task) => {
    task.plan.nextAction = 'Return results.';
  });
  expect(invoke(root, ['check', 'probe']).status).toBe(0);
  await edit(root, (task) => {
    task.plan.acceptance[0]!.criterion = 'Different required behavior.';
  });
  expect(invoke(root, ['check', 'probe']).output).toContain('task contract');
});

it('does not pass evidence for temporary input bytes that a command restores before exiting', async () => {
  const root = await fixture();
  await ready(root);
  const original = await readFile(join(root, 'src/value.ts'), 'utf8');
  const script =
    'const fs=require("node:fs");const p="src/value.ts";const original=fs.readFileSync(p);fs.writeFileSync(p,"temporary candidate");if(fs.readFileSync(p,"utf8")!=="temporary candidate")process.exit(2);fs.writeFileSync(p,original);';
  expect(run(root, script).status).toBe(1);
  expect(await readFile(join(root, 'src/value.ts'), 'utf8')).toBe(original);
  expect((await state(root)).evidence[0]!.result).toBe('pending');
  await accept(root);
  expect(invoke(root, ['check', 'probe']).output).toContain('WORK_RELEASE');
});

it('can refresh missing release evidence without manually bypassing release checks', async () => {
  const root = await fixture();
  await ready(root);
  expect(run(root).status).toBe(0);
  await accept(root);
  const task = await state(root);
  await rm(join(root, task.evidence[0]!.artifact));
  expect(invoke(root, ['check', 'probe']).output).toContain('WORK_RELEASE');
  expect(run(root).status).toBe(0);
  const refreshed = await state(root);
  expect(refreshed.evidence).toHaveLength(3);
  expect(refreshed.stage).toBe('C1_EVIDENCE_PENDING');
  expect(refreshed.reviewDecision).toBe('PENDING');
  expect(invoke(root, ['check', 'probe']).status).toBe(0);
});

it('requires revision reconciliation and reuses same-content evidence after a commit', async () => {
  const root = await fixture();
  await ready(root);
  expect(run(root).status).toBe(0);
  const candidate = (await state(root)).checkpoint!.candidate;
  expect(spawnSync('git', ['add', '.'], { cwd: root }).status).toBe(0);
  expect(
    spawnSync(
      'git',
      [
        '-c',
        'user.name=Fixture',
        '-c',
        'user.email=fixture@example.invalid',
        '-c',
        'commit.gpgsign=false',
        '-c',
        'core.hooksPath=/dev/null',
        'commit',
        '-qm',
        'fixture',
      ],
      { cwd: root },
    ).status,
  ).toBe(0);
  expect(invoke(root, ['check', 'probe']).output).toContain('WORK_REVISION_CHANGED');
  expect(invoke(root, ['sync', 'probe', 'Verified the commit preserved task inputs.']).status).toBe(
    0,
  );
  expect((await state(root)).checkpoint!.candidate).toBe(candidate);
  expect(JSON.parse(invoke(root, ['check', 'probe']).output).evidence[0].result).toBe('pass');
});

it('keeps sibling tasks independent and archives in place without deleting their evidence', async () => {
  const root = await fixture();
  await ready(root);
  await ready(root, 'second');
  const second = await readFile(statePath(root, 'second'), 'utf8');
  expect(run(root).status).toBe(0);
  expect(
    invoke(root, ['archive', 'probe', 'Cancelled by the fixture user; preserve the result.'])
      .status,
  ).toBe(0);
  expect(invoke(root, ['check', 'probe']).output).toContain('WORK_ARCHIVED');
  expect(run(root).status).toBe(1);
  expect(await readFile(statePath(root, 'second'), 'utf8')).toBe(second);
  expect(await readdir(join(root, '.work/tasks/probe/evidence'))).toHaveLength(1);
});

it('rejects private/traversal/symlink inputs, missing sources, and foreign workspace ownership', async () => {
  const root = await fixture();
  await ready(root);
  const original = await state(root);
  for (const path of ['../outside', '/tmp/foreign', '.work', '.env', 'docs/missing.md']) {
    await edit(root, (task) => {
      task.plan.inputs = [...original.plan.inputs, path];
    });
    expect(invoke(root, ['sync', 'probe', 'Attempt invalid input.']).status, path).toBe(1);
  }
  await writeFile(statePath(root), JSON.stringify(original));
  await symlink(join(root, 'docs/api.md'), join(root, 'src/alias.ts'));
  expect(invoke(root, ['check', 'probe']).output).toContain('INVENTORY_SYMLINK');
  await rm(join(root, 'src/alias.ts'));
  await edit(root, (task) => {
    task.workspace = '/different-workspace';
  });
  expect(invoke(root, ['check', 'probe']).output).toContain('WORK_OWNER');
});

it('rejects a symlinked private directory before writing', async () => {
  const root = await fixture();
  const outside = await mkdtemp(join(tmpdir(), 'mio-work-outside-'));
  scratch.push(outside);
  await rm(join(root, '.work'), { recursive: true });
  await symlink(outside, join(root, '.work'));
  expect(invoke(root, ['init', 'alice']).output).toContain('WORK_SYMLINK');
  expect(await readdir(outside)).toEqual([]);
});

it('does not overwrite state edited during a check and preserves the unbound raw log', async () => {
  const root = await fixture();
  await ready(root);
  const script =
    'const fs=require("node:fs");const p=".work/tasks/probe/state.json";const t=JSON.parse(fs.readFileSync(p));t.plan.nextAction="Concurrent author update";fs.writeFileSync(p,JSON.stringify(t));';
  expect(run(root, script).output).toContain('WORK_CONFLICT');
  expect((await state(root)).plan.nextAction).toBe('Concurrent author update');
  expect((await state(root)).evidence).toHaveLength(0);
  expect(await readdir(join(root, '.work/tasks/probe/evidence'))).toHaveLength(1);
});

it('checks retrieved manual evidence and refuses release after its artifact is corrupted or missing', async () => {
  const root = await fixture();
  await ready(root);
  await edit(root, (task) => {
    task.plan.acceptance = [
      { id: 'observe', criterion: 'Actual behavior observed.', method: 'behavior' },
      task.plan.acceptance.find((item) => item.id === 'quality-review')!,
    ];
  });
  expect(invoke(root, ['sync', 'probe', 'Bound the observed acceptance method.']).status).toBe(0);
  const relative = '.work/tasks/probe/evidence/observation.md';
  await mkdir(dirname(join(root, relative)), { recursive: true });
  await writeFile(join(root, relative), '# Actual observation\nEnvironment and actions.\n');
  expect(
    invoke(root, ['evidence', 'probe', 'observe', 'pass', relative, 'Observed the criterion.'])
      .status,
  ).toBe(0);
  await accept(root);
  expect(invoke(root, ['check', 'probe']).status).toBe(0);
  await writeFile(join(root, relative), 'changed');
  expect(invoke(root, ['check', 'probe']).output).toContain('corrupt');
  await rm(join(root, relative));
  expect(invoke(root, ['check', 'probe']).output).toContain('missing');
});

it('blocks unresolved dependencies without preventing preparation of a bounded handoff', async () => {
  const root = await fixture();
  await ready(root);
  await edit(root, (task) => {
    task.plan.dependencies = [{ task: 'upstream', ref: 'Shared upstream contract', ready: false }];
    task.plan.blockers = ['Upstream artifact has not arrived.'];
  });
  expect(invoke(root, ['sync', 'probe', 'Recorded the upstream blocker.']).output).toContain(
    'WORK_BLOCKED',
  );
  expect(run(root).status).toBe(1);
  expect(invoke(root, ['handoff', 'probe']).status).toBe(0);
});

it('receives a handoff into another member workspace only after retrieving matching code, without inheriting authority or passes', async () => {
  const sender = await fixture('alice');
  const receiver = await fixture('bob');
  await ready(sender);
  expect(run(sender).status).toBe(0);
  const prepared = invoke(sender, ['handoff', 'probe']);
  expect(prepared.status, prepared.output).toBe(0);
  const markdown = await readFile(prepared.output, 'utf8');
  expect(markdown).not.toContain(sender);
  expect(markdown).not.toContain('.work/tasks/');
  await mkdir(join(receiver, '.work/inbox'));
  await writeFile(join(receiver, '.work/inbox/probe.md'), markdown);
  await writeFile(join(receiver, 'src/value.ts'), 'different code');
  expect(invoke(receiver, ['receive', '.work/inbox/probe.md']).output).toContain(
    'WORK_HANDOFF_CODE',
  );
  await expect(readFile(statePath(receiver))).rejects.toThrow();
  await cp(join(sender, 'src/value.ts'), join(receiver, 'src/value.ts'));
  expect(invoke(receiver, ['receive', '.work/inbox/probe.md']).status).toBe(0);
  const received = await state(receiver);
  expect(received.member).toBe('bob');
  expect(received.plan.authorization).toBe('');
  expect(received.checkpoint).toBeNull();
  expect(received.evidence).toEqual([]);
  expect(received.notes.join(' ')).toContain('Reported checks: pass');
  expect(invoke(receiver, ['check', 'probe']).output).toContain('WORK_CONTRACT');
  expect(invoke(receiver, ['receive', '.work/inbox/probe.md']).status).toBe(1);
  await edit(receiver, (task) => {
    task.plan.authorization = 'Receiver user explicitly requests continuation.';
  });
  expect(
    invoke(receiver, [
      'sync',
      'probe',
      'Verified matching code and local authority; checks need rerun.',
    ]).status,
  ).toBe(0);
  expect(run(receiver).status).toBe(0);
  expect(invoke(sender, ['handoff', 'probe']).output).toBe(prepared.output);
});

it('rejects corrupt/unknown-version records and damaged handoff data without replacing originals', async () => {
  const root = await fixture();
  await ready(root);
  await edit(root, (task) => {
    (task as { version: number }).version = 2;
  });
  const original = await readFile(statePath(root), 'utf8');
  expect(invoke(root, ['sync', 'probe', 'Attempt unknown version.']).output).toContain(
    'WORK_SCHEMA',
  );
  expect(await readFile(statePath(root), 'utf8')).toBe(original);
  await mkdir(join(root, '.work/inbox'));
  await writeFile(join(root, '.work/inbox/bad.md'), '# No machine handoff\n');
  expect(invoke(root, ['receive', '.work/inbox/bad.md']).output).toContain('WORK_HANDOFF_FORMAT');
});
