import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import {
  addEvidence,
  artifact,
  assess,
  capture,
  contractIssues,
  environment,
  inputStamp,
} from './work-context.ts';
import { handoff, receive } from './work-handoff.ts';
import {
  checkedPath,
  digest,
  draft,
  identifier,
  json,
  loadTask,
  member,
  saveTask,
} from './work-records.ts';

const root = await realpath('.');
const [command, ...args] = process.argv.slice(2);
const help = `Usage: pnpm work <command>
  init <member>                         initialize this member's workspace
  start <task> <goal> [source.md ...]    create a draft; edit its contract before sync
  status                                list local tasks
  check <task>                          read-only context/evidence assessment
  sync <task> <reason>                  acknowledge inspected changes; retain evidence
  run <task> <criterion> -- <argv ...>  capture an automated check without a shell
  evidence <task> <criterion> <pass|fail|pending> <artifact> <summary>
  handoff <task>                        prepare a local portable Markdown handoff
  receive <shared.md>                   verify candidate, create this member's draft
  archive <task> <reason>               mark history; retain all files
Protocol: docs/coordination.md and docs/work-records.md`;

async function main() {
  if (!command || command === 'help') return console.log(help);
  // Commands are a repository development tool, never a product-runtime dependency.
  await readFile(await checkedPath(root, 'harness.config.json'));
  if (command === 'init') {
    if (args.length !== 1) throw new Error(help);
    const actor = identifier(args[0]!);
    const path = await checkedPath(root, '.work/member.json');
    await mkdir(dirname(path), { recursive: true });
    try {
      await writeFile(path, json({ version: 1, member: actor, workspace: root }), { flag: 'wx' });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
    if ((await member(root)) !== actor)
      throw new Error('WORK_MEMBER: this workspace belongs to another member');
    return console.log(`Initialized ${actor}; existing records and evidence retained.`);
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
  if (command === 'status') {
    if (args.length) throw new Error(help);
    const directory = await checkedPath(root, '.work/tasks');
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      return console.log('No local tasks.');
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
      const { task } = await loadTask(root, entry.name);
      console.log(
        `${task.plan.id}: ${task.archived ? 'archived' : (task.stage ?? 'contract pending')}; ${task.plan.nextAction}`,
      );
    }
    return;
  }
  if (command === 'receive') {
    if (args.length !== 1) throw new Error(help);
    return console.log(
      `Received draft ${(await receive(root, args[0]!)).plan.id}; verify authority and evidence before sync.`,
    );
  }
  if (!args[0]) throw new Error(help);
  const { task, raw } = await loadTask(root, args[0]);
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
