import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, readdir, realpath } from 'node:fs/promises';
import { dirname } from 'node:path';
import {
  addEvidence,
  artifact,
  assess,
  capture,
  contractIssues,
  environment,
  inputStamp,
} from './context.ts';
import { handoff, receive } from './handoff.ts';
import { guide, taskSummary } from './guide.ts';
import { ensureTask, inspectTask, updateTask } from './manage.ts';
import { deliver } from './delivery.ts';
import { qualityCriterion, qualityReviewResult } from './quality-review.ts';
import {
  checkedPath,
  digest,
  draft,
  initializeMember,
  json,
  loadTask,
  member,
  saveTask,
} from './records.ts';

const root = await realpath('.');
const [command, ...args] = process.argv.slice(2);
const help = `Usage: pnpm work <command>
Agent operates this CLI; the user supplies goals and decisions.
  ensure --stdin                       create/reuse a PRD subtask from structured JSON
  update <task> --stdin                 update plan/progress with an expected revision
  deliver <task> --stdin                prepare a draft or complete an accepted delivery
  init <member>                         initialize this member's workspace
  start <task> <goal> [source.md ...]    legacy draft; complete via update before sync
  status                                list local tasks
  guide <action>                        read common rules and one action, without local records
  context <task> <action>               read current task summary, checks and one action
  check <task>                          read-only context/evidence assessment
  sync <task> <reason>                  acknowledge inspected changes; retain evidence
  run <task> <criterion> -- <argv ...>  capture an automated check without a shell
  exec <task> -- <argv ...>             check C1 before launching an implementation command
  evidence <task> <criterion> <pass|fail|pending> <artifact> <summary>
  handoff <task>                        prepare a local portable Markdown handoff
  receive <shared.md>                   verify candidate, create this member's draft
  archive <task> <reason>               mark history; retain all files
Actions: start, resume, implement, verify, deliver, handoff, archive
Agent entry: guide start, then ensure --stdin; expand only the current action.`;

async function input() {
  if (process.stdin.isTTY) throw new Error('WORK_REQUEST: pipe a JSON request on stdin');
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  if (!command || command === 'help') return console.log(help);
  // Commands are a repository development tool, never a product-runtime dependency.
  await readFile(await checkedPath(root, 'harness.config.json'));
  if (command === 'guide') {
    if (args.length !== 1) throw new Error(help);
    return console.log(json(await guide(root, args[0]!)));
  }
  if (command === 'init') {
    if (args.length !== 1) throw new Error(help);
    const actor = await initializeMember(root, args[0]!);
    return console.log(`Initialized ${actor}; existing records and evidence retained.`);
  }
  if (command === 'ensure') {
    if (args.length !== 1 || args[0] !== '--stdin') throw new Error(help);
    return console.log(json(await ensureTask(root, await input())));
  }
  if (command === 'update') {
    if (args.length !== 2 || args[1] !== '--stdin') throw new Error(help);
    return console.log(json(await updateTask(root, args[0]!, await input())));
  }
  if (command === 'deliver') {
    if (args.length !== 2 || args[1] !== '--stdin') throw new Error(help);
    return console.log(json(await deliver(root, args[0]!, await input())));
  }
  if (command === 'status') {
    if (args.length) throw new Error(help);
    const directory = await checkedPath(root, '.work/tasks');
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      return console.log(json({ tasks: [] }));
    }
    const tasks = [];
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
      const { task } = await loadTask(root, entry.name);
      const { assessment } = await inspectTask(root, task, json(task));
      tasks.push({
        id: task.plan.id,
        goal: task.plan.goal,
        requirement: task.plan.requirement,
        stage: task.stage,
        archived: task.archived,
        nextAction: task.plan.nextAction,
        assessment,
      });
    }
    return console.log(json({ tasks }));
  }
  const actor = await member(root);
  if (command === 'start') {
    if (args.length < 2) throw new Error(help);
    const task = draft(root, actor, args[0]!, args[1]!);
    task.plan.sources.push(...args.slice(2));
    await saveTask(root, task);
    return console.log(
      `Draft: .work/tasks/${task.plan.id}/state.json; complete the contract before sync.`,
    );
  }
  if (command === 'receive') {
    if (args.length !== 1) throw new Error(help);
    return console.log(
      `Received draft ${(await receive(root, args[0]!)).plan.id}; verify authority and evidence before sync.`,
    );
  }
  if (!args[0]) throw new Error(help);
  const { task, raw } = await loadTask(root, args[0]);
  if (command === 'context') {
    if (args.length !== 2) throw new Error(help);
    const reading = await guide(root, args[1]!);
    const inspected = await inspectTask(root, task, raw);
    return console.log(json({ ...inspected, task: taskSummary(task, args[1]!), ...reading }));
  }
  if (command === 'check') {
    if (args.length !== 1) throw new Error(help);
    const result = await assess(root, task);
    console.log(json(result));
    if (!result.ready) process.exitCode = 1;
    return;
  }
  if (command === 'handoff') {
    if (args.length !== 1) throw new Error(help);
    return console.log(await handoff(root, task));
  }
  if (task.archived)
    throw new Error('WORK_ARCHIVED: explicitly reopen the record after reconciling authorization');
  if (command === 'exec') {
    if (args[1] !== '--' || args.length < 3) throw new Error(help);
    if (task.stage !== 'C1_IMPLEMENTATION')
      throw new Error('WORK_EXEC_STAGE: enter C1_IMPLEMENTATION before implementation commands');
    const assessment = await assess(root, task);
    if (!assessment.ready) throw new Error(assessment.errors.join('\n'));
    const outcome = spawnSync(args[2]!, args.slice(3), { cwd: root, stdio: 'inherit' });
    if (outcome.error) throw outcome.error;
    process.exitCode = outcome.status ?? 1;
    console.log(
      `Implementation command exited ${outcome.status}; inspect changes before work sync.`,
    );
    return;
  }
  if (command === 'sync') {
    if (args.length !== 2 || !args[1]!.trim()) throw new Error(help);
    const checkpoint = await capture(root, task);
    if (task.checkpoint && task.checkpoint.candidate !== checkpoint.candidate) {
      task.reviewDecision = 'PENDING';
      task.releaseDisposition = 'HOLD_FOR_EVIDENCE';
      if (task.stage === 'C1_RELEASED') task.stage = 'C1_EVIDENCE_PENDING';
    }
    task.checkpoint = checkpoint;
    task.notes.push(
      `${new Date().toISOString()} ${args[1]}; candidate ${task.checkpoint.candidate}`,
    );
    if (task.stage === null && !contractIssues(task).length) task.stage = 'C0_READY';
    await saveTask(root, task, raw);
    const result = await assess(root, task);
    console.log(json(result));
    if (!result.ready) process.exitCode = 1;
    return;
  }
  if (command === 'archive') {
    if (args.length !== 2 || !args[1]!.trim()) throw new Error(help);
    task.archived = true;
    task.notes.push(`${new Date().toISOString()} archived: ${args[1]}; stage ${task.stage}`);
    await saveTask(root, task, raw);
    return console.log('Archived in place; records, failures and artifacts retained.');
  }
  if (!['run', 'evidence'].includes(command)) throw new Error(help);
  // An explicit evidence refresh must be possible even when the old release lost its artifacts.
  if (task.stage === 'C1_RELEASED' || task.releaseDisposition === 'RELEASED') {
    task.stage = 'C1_EVIDENCE_PENDING';
    task.releaseDisposition = 'HOLD_FOR_EVIDENCE';
    task.reviewDecision = 'PENDING';
  }
  const state = await assess(root, task);
  if (!state.ready) throw new Error(state.errors.join('\n'));
  const criterion = task.plan.acceptance.find((entry) => entry.id === args[1]);
  if (!criterion) throw new Error('WORK_CRITERION: use an acceptance id from this task');
  if (command === 'evidence') {
    if (
      args.length !== 5 ||
      criterion.method === 'automated' ||
      !['pass', 'fail', 'pending'].includes(args[2]!)
    )
      throw new Error(
        'WORK_EVIDENCE: automated checks use work run; other evidence needs result, artifact and summary',
      );
    const bytes = await artifact(root, task.plan.id, args[3]!);
    if (
      criterion.id === qualityCriterion.id &&
      qualityReviewResult(bytes.toString('utf8'), state.candidate) !== args[2]
    )
      throw new Error('WORK_QUALITY_EVIDENCE: declared result disagrees with review dimensions');
    addEvidence(task, {
      criterion: criterion.id,
      method: criterion.method,
      result: args[2]!,
      artifact: args[3]!,
      sha256: digest(bytes),
      candidate: state.candidate,
      summary: args[4]!,
      environment: environment(),
    });
    await saveTask(root, task, raw);
    return console.log('Evidence recorded; human acceptance remains pending.');
  }
  if (criterion.method !== 'automated' || args[2] !== '--' || args.length < 4)
    throw new Error(help);
  const argv = args.slice(3);
  const beforeStamp = await inputStamp(root, task.checkpoint!);
  const relative = `.work/tasks/${task.plan.id}/evidence/${randomUUID()}.log`;
  const path = await checkedPath(root, relative);
  await mkdir(dirname(path), { recursive: true });
  const log = await open(path, 'wx');
  console.log(`Recording: ${relative}`);
  let outcome;
  try {
    await log.write(
      `${json({ argv, candidate: state.candidate, environment: environment(), started: new Date().toISOString() })}\n`,
    );
    outcome = spawnSync(argv[0]!, argv.slice(1), { cwd: root, stdio: ['ignore', log.fd, log.fd] });
    await log.write(
      `\n${json({ exitCode: outcome.status, signal: outcome.signal, error: outcome.error?.message })}`,
    );
  } finally {
    await log.close();
  }
  let changed = true;
  let contextError = '';
  try {
    const after = await capture(root, task);
    changed =
      after.candidate !== state.candidate || beforeStamp !== (await inputStamp(root, after));
  } catch (error) {
    contextError = error instanceof Error ? error.message : String(error);
  }
  const passed = outcome.status === 0 && !outcome.error && !changed;
  addEvidence(task, {
    criterion: criterion.id,
    method: 'automated',
    result: changed ? 'pending' : passed ? 'pass' : 'fail',
    artifact: relative,
    sha256: digest(await readFile(path)),
    candidate: state.candidate,
    summary: `${json(argv).trim()}; exit ${outcome.status}; contextChanged=${changed}${contextError ? `; ${contextError}` : ''}`,
    environment: environment(),
  });
  await saveTask(root, task, raw);
  console.log(
    `${passed ? 'PASS' : 'NOT PASSED'}: ${relative}${changed ? '; WORK_CONTEXT_CHANGED during command' : ''}`,
  );
  if (!passed) process.exitCode = 1;
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
