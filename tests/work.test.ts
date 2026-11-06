import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import type { Task } from '../scripts/work-records.ts';

const project = resolve('.');
const cli = join(project, 'scripts/work.ts');
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
    'docs/coordination.md': '# Coordination\n',
    'docs/work-records.md': '# Records\n',
    'docs/api.md': '# API\n',
    'src/value.ts': 'export const value = 1;\n',
  })) {
    await mkdir(dirname(join(root, file)), { recursive: true });
    await writeFile(join(root, file), source);
  }
  expect(spawnSync('git', ['init', '-q', '-b', 'main'], { cwd: root }).status).toBe(0);
  expect(invoke(root, ['init', actor]).status).toBe(0);
  return root;
}

// The child has no Skill paths, Codex tools or conversation history; all behavior enters the real CLI.
function invoke(root: string, args: string[]) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { PATH: process.env.PATH ?? '' },
    timeout: 10000,
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
  await edit(
    root,
    (task) => {
      task.plan.scope = ['src'];
      task.plan.authorization = 'Fixture user requests local probe implementation and checks.';
      task.plan.acceptance = [
        { id: 'checks', criterion: 'The probe check passes.', method: 'automated' },
      ];
      task.plan.nextAction = 'Implement and check the probe.';
      task.plan.stopCondition = 'Return verified results for review.';
    },
    id,
  );
  const result = invoke(root, ['sync', id, 'Read the contract and inspected the baseline.']);
  expect(result.status, result.output).toBe(0);
}

function run(root: string, script = 'console.log("observed probe")', id = 'probe') {
  return invoke(root, ['run', id, 'checks', '--', process.execPath, '-e', script]);
}

async function accept(root: string) {
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
  expect(task.evidence).toHaveLength(1);
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
  expect(refreshed.evidence).toHaveLength(2);
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
