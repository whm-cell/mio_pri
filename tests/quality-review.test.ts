import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { digest } from '../scripts/harness/work/records.ts';
import type { Task } from '../scripts/harness/work/records.ts';
import { reviewFixture, reviewMarkdown } from './quality-review-fixture.ts';

const project = resolve('.');
const scratch: string[] = [];
afterEach(async () => {
  await Promise.all(scratch.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function cli(root: string, args: string[], input?: unknown) {
  const result = spawnSync(
    process.execPath,
    [join(project, 'scripts/harness/work/cli.ts'), ...args],
    {
      cwd: root,
      encoding: 'utf8',
      env: { PATH: process.env.PATH ?? '' },
      input: input === undefined ? undefined : JSON.stringify(input),
      timeout: 10000,
    },
  );
  return { status: result.status, output: `${result.stdout}\n${result.stderr}`.trim() };
}

async function fixture(scope = ['src']) {
  const root = await mkdtemp(join(tmpdir(), 'mio-quality-'));
  scratch.push(root);
  for (const file of ['harness.config.json', 'docs/coordination.md', 'docs/work-records.md']) {
    await mkdir(dirname(join(root, file)), { recursive: true });
    await cp(join(project, file), join(root, file));
  }
  for (const [file, value] of Object.entries({
    'package.json': '{"type":"module"}',
    'AGENTS.md': '# Fixture rules',
    'docs/api.md': '# API',
    'src/value.ts': 'export const value = 1;',
  })) {
    await mkdir(dirname(join(root, file)), { recursive: true });
    await writeFile(join(root, file), value);
  }
  const request = {
    requirement: { source: 'docs/api.md', section: 'API', key: 'quality' },
    plan: {
      goal: 'Change a fixture capability.',
      scope,
      inputs: ['src'],
      authorization: 'Fixture user authorizes local changes and checks.',
      acceptance: [{ id: 'checks', method: 'automated', criterion: 'Fixture check succeeds.' }],
      nextAction: 'Implement and verify.',
      stopCondition: 'Return for human acceptance.',
    },
  };
  const created = cli(root, ['ensure', '--stdin'], request);
  expect(created.status, created.output).toBe(0);
  const id = JSON.parse(created.output).task.id as string;
  const path = join(root, `.work/tasks/${id}/state.json`);
  const state = async (): Promise<Task> => JSON.parse(await readFile(path, 'utf8'));
  const context = () => JSON.parse(cli(root, ['context', id, 'verify']).output);
  return { root, id, path, state, context, request };
}

it.each(['src', 'scripts/harness', 'scripts/service', 'tests', '.', 'src/planned.ts'])(
  'registers a review for source scope %s, including planned source and ancestor directories',
  async (scope) => {
    const f = await fixture([scope]);
    const original = await readFile(f.path, 'utf8');
    expect((await f.state()).plan.acceptance).toContainEqual(
      expect.objectContaining({
        id: 'quality-review',
        method: 'review',
      }),
    );
    expect(cli(f.root, ['ensure', '--stdin'], f.request).status).toBe(0);
    expect(await readFile(f.path, 'utf8')).toBe(original);
    expect(f.context().assessment.qualityReview).toEqual({
      required: true,
      criterion: 'quality-review',
      result: 'pending',
    });
  },
);

it('leaves a document task alone despite source inputs, and registers review on scope expansion', async () => {
  const f = await fixture(['docs/api.md']);
  expect(f.context().assessment.qualityReview.result).toBe('not_required');
  expect((await f.state()).plan.acceptance).toHaveLength(1);
  const result = cli(f.root, ['update', f.id, '--stdin'], {
    revision: f.context().revision,
    reason: 'Fixture user adds source implementation.',
    plan: { scope: ['src', 'docs/api.md'] },
  });
  expect(result.status, result.output).toBe(0);
  expect((await f.state()).plan.acceptance).toHaveLength(2);
  expect(JSON.parse(result.output).assessment.errors.join()).toContain('WORK_CONTEXT_CHANGED');
  await rm(join(f.root, 'src/value.ts'));
  // Use default manifest inputs after deleting the only source; the planned source scope remains.
  const current = await f.state();
  current.plan.inputs = ['package.json'];
  await writeFile(f.path, JSON.stringify(current));
  expect(f.context().assessment.qualityReview.required).toBe(true);
});

it('refuses missing or automated quality criteria and repairs legacy omission only on explicit update', async () => {
  const f = await fixture();
  const task = await f.state();
  task.plan.acceptance = task.plan.acceptance.filter((item) => item.id !== 'quality-review');
  await writeFile(f.path, JSON.stringify(task));
  expect(cli(f.root, ['check', f.id]).output).toContain('WORK_QUALITY_CONTRACT');
  const before = await readFile(f.path, 'utf8');
  expect(cli(f.root, ['ensure', '--stdin'], { requirement: f.request.requirement }).status).toBe(0);
  expect(await readFile(f.path, 'utf8')).toBe(before);
  expect(
    cli(f.root, ['deliver', f.id, '--stdin'], {
      action: 'prepare',
      revision: f.context().revision,
    }).output,
  ).toContain('WORK_QUALITY_CONTRACT');
  expect(
    cli(f.root, ['update', f.id, '--stdin'], {
      revision: f.context().revision,
      reason: 'Use the existing quality gate.',
      plan: {
        acceptance: [{ id: 'quality-review', method: 'automated', criterion: 'Not a review.' }],
      },
    }).output,
  ).toContain('WORK_QUALITY_CONTRACT');
  expect(await readFile(f.path, 'utf8')).toBe(before);
  expect(
    cli(f.root, ['update', f.id, '--stdin'], {
      revision: f.context().revision,
      reason: 'Register the missing required review.',
    }).status,
  ).toBe(0);
  expect((await f.state()).plan.acceptance.at(-1)?.method).toBe('review');
});

it('runs the real verify/evidence/delivery flow, blocks incomplete reviews and rejects rebinding an old original', async () => {
  const f = await fixture();
  expect(
    cli(f.root, ['deliver', f.id, '--stdin'], {
      action: 'prepare',
      revision: f.context().revision,
    }).status,
  ).toBe(0);
  expect(cli(f.root, ['sync', f.id, 'Reconciled delivery outputs.']).status).toBe(0);
  expect(
    cli(f.root, ['run', f.id, 'checks', '--', process.execPath, '-e', 'console.log(1)']).status,
  ).toBe(0);
  const prepare = () =>
    cli(f.root, ['deliver', f.id, '--stdin'], {
      action: 'prepare',
      revision: f.context().revision,
      title: 'Fixture result',
      modules: ['fixture'],
      outcomes: 'Fixture implementation is ready.',
      decisions: 'Use existing protocol.',
      limitations: 'Isolated fixture only.',
      evidence: ['checks', 'quality-review'].map((criterion) => ({
        criterion,
        representation: 'original',
      })),
    });
  expect(prepare().output).toContain('WORK_DELIVERY_EVIDENCE');
  const candidate = f.context().assessment.candidate as string;
  let index = 0;
  const submit = async (report: unknown, result = 'pass') => {
    const path = `.work/tasks/${f.id}/evidence/review-${index++}.md`;
    await writeFile(
      join(f.root, path),
      typeof report === 'string' ? report : reviewMarkdown(report),
    );
    return {
      path,
      ...cli(f.root, ['evidence', f.id, 'quality-review', result, path, 'Fixture observations.']),
    };
  };
  expect((await submit('# Looks fine')).status).toBe(1);
  const incomplete = reviewFixture(candidate);
  for (const result of [['pending'], ['fail']]) {
    expect(
      (
        await submit({
          ...incomplete,
          dimensions: {
            ...incomplete.dimensions,
            algorithm: { result, evidence: 'Malformed status must never become a passing review.' },
          },
        })
      ).status,
    ).toBe(1);
  }
  expect(
    (await submit({ ...incomplete, dimensions: { algorithm: incomplete.dimensions.algorithm } }))
      .status,
  ).toBe(1);
  for (const result of ['fail', 'pending']) {
    const report = reviewFixture(candidate);
    report.dimensions.unused = { result, evidence: 'Fixture issue or missing consumer evidence.' };
    expect((await submit(report, 'pass')).status).toBe(1);
    expect((await submit(report, result)).status).toBe(0);
    expect(prepare().output).toContain('WORK_DELIVERY_EVIDENCE');
  }
  const valid = await submit(reviewFixture(candidate));
  expect(valid.status, valid.output).toBe(0);
  expect((await f.state()).evidence.map((item) => item.result)).toEqual([
    'pass',
    'fail',
    'pending',
    'pass',
  ]);
  expect(prepare().status).toBe(0);
  expect((await f.state()).reviewDecision).toBe('PENDING');
  await writeFile(join(f.root, 'src/value.ts'), 'export const value = 2;');
  expect(cli(f.root, ['check', f.id]).status).toBe(1);
  expect(cli(f.root, ['sync', f.id, 'Inspected changed source.']).status).toBe(0);
  expect(f.context().assessment.qualityReview.result).toBe('pending');
  expect(
    cli(f.root, ['evidence', f.id, 'quality-review', 'pass', valid.path, 'Old review.']).output,
  ).toContain('review candidate mismatch');
  expect((await f.state()).evidence).toHaveLength(4);
});

it('rechecks review contents at delivery instead of trusting a forged pass label', async () => {
  const f = await fixture();
  const task = await f.state();
  const path = `.work/tasks/${f.id}/evidence/forged.md`;
  const report = reviewFixture(task.checkpoint!.candidate);
  report.dimensions.algorithm.result = 'fail';
  const bytes = reviewMarkdown(report);
  await mkdir(dirname(join(f.root, path)), { recursive: true });
  await writeFile(join(f.root, path), bytes);
  task.evidence.push({
    criterion: 'quality-review',
    method: 'review',
    result: 'pass',
    candidate: task.checkpoint!.candidate,
    artifact: path,
    sha256: digest(bytes),
    summary: 'Forged pass',
    environment: 'fixture',
  });
  await writeFile(f.path, JSON.stringify(task));
  expect(f.context().assessment.qualityReview.result).toBe('invalid');
  const output = cli(f.root, ['context', f.id, 'verify']).output;
  expect(output).toContain('algorithm');
  expect(output).toContain('unused');
  expect(output).toContain('reuse');
  expect(output).not.toContain('## 交付命令');
});
