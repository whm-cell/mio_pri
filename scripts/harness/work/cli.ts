import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, realpath } from 'node:fs/promises';
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
import { guide } from './guide.ts';
import { ensureTask, inspectTask, updateTask } from './manage.ts';
import { deliver } from './delivery.ts';
import { qualityCriterion, qualityReviewResult } from './quality-review.ts';
import { normsCriterion, normsIssues, normsReviewResult } from './norms-review.ts';
import { inventory, loadConfig } from '../inventory.ts';
import { inspectTaskDocuments } from '../task-documents.ts';
import { checkDocuments } from '../check-documents.ts';
import { finiteOutput, readPage } from './output.ts';
import { readOptions } from './read-options.ts';
import { readStatus } from './read-status.ts';
import { assessmentOutput, inspectionOutput, readTask } from './read-task.ts';
import { readPublicResult } from './public-read.ts';
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
  deliver <task> --stdin                prepare privately or record an accepted PRD result
  init <member>                         initialize this member's workspace
  start <task> <goal> [source.md ...]    legacy draft; complete via update before sync
  status [--query text] [--stage stage] [--archived active|archived|all]
                                        page records; current assessment is not checked
  documents [read options]               page task identities and validation issues
  guide <action> [--section ref]         navigate one action; expand one stable section ref
  context <task> <action>               read current task summary, checks and one action
  read <task> <task|check> [pointer]     page selected record fields or current checks
  read <task> evidence <index>          page one ledger-bound original (UTF-8 text)
  read-result <prd> [key] [read options] page a public result without personal records
  check <task>                          read-only context/evidence assessment
  sync <task> <reason>                  acknowledge inspected changes; retain evidence
  run <task> <criterion> -- <argv ...>  capture an automated check without a shell
  exec <task> -- <argv ...>             check C1 before launching an implementation command
  evidence <task> <criterion> <pass|fail|pending> <artifact> <summary>
  handoff <task>                        prepare a local portable Markdown handoff
  receive <shared.md> [result-key]      verify a result/handoff, create this member's draft
  archive <task> <reason>               mark history; retain all files
Actions: start, resume, implement, verify, deliver, handoff, archive
Read options: --select /JSON/pointer --offset N --limit N --hash SHA256
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
    const { positionals, options, flags } = readOptions(args, ['section']);
    if (positionals.length !== 1) throw new Error(help);
    return console.log(json(await guide(root, positionals[0]!, options, flags.section)));
  }
  if (command === 'documents') {
    const { positionals, options } = readOptions(args);
    if (positionals.length) throw new Error(help);
    const config = await loadConfig(root);
    const scan = await inventory(root, config);
    const registry = await inspectTaskDocuments(root, config);
    const checked = await checkDocuments(root, scan.files, config);
    const issues = [...new Set([...scan.errors, ...registry.errors, ...checked.errors])];
    const source = {
      documents: registry.documents.map((entry) => ({
        kind: entry.kind,
        identity: entry.identity,
        currentPath: entry.path,
        aliases: entry.aliases ?? [],
      })),
      issues,
    };
    console.log(
      json(
        options.select || options.offset || options.limit !== undefined || options.hash
          ? readPage(source, options, ['documents'])
          : finiteOutput(source, (pointer) => ({
              argv: ['documents', '--select', pointer],
              sha256: digest(json(source)),
            })),
      ),
    );
    if (issues.length) process.exitCode = 1;
    return;
  }
  if (command === 'init') {
    if (args.length !== 1) throw new Error(help);
    const actor = await initializeMember(root, args[0]!);
    return console.log(`Initialized ${actor}; existing records and evidence retained.`);
  }
  if (command === 'ensure') {
    if (args.length !== 1 || args[0] !== '--stdin') throw new Error(help);
    return console.log(json(inspectionOutput(await ensureTask(root, await input()))));
  }
  if (command === 'update') {
    if (args.length !== 2 || args[1] !== '--stdin') throw new Error(help);
    return console.log(json(inspectionOutput(await updateTask(root, args[0]!, await input()))));
  }
  if (command === 'deliver') {
    if (args.length !== 2 || args[1] !== '--stdin') throw new Error(help);
    const result = await deliver(root, args[0]!, await input());
    const { raw } = await loadTask(root, args[0]!);
    return console.log(
      json(
        finiteOutput(result, () => ({
          argv: ['read', args[0]!, 'task', '--select', '/delivery'],
          sha256: digest(raw),
        })),
      ),
    );
  }
  if (command === 'status') {
    const { positionals, options, flags } = readOptions(args, ['query', 'stage', 'archived']);
    if (positionals.length) throw new Error(help);
    return console.log(json(await readStatus(root, options, flags)));
  }
  if (command === 'read') {
    const { positionals, options } = readOptions(args);
    if (positionals.length < 2 || positionals.length > 3) throw new Error(help);
    const [id, kind, selected] = positionals;
    if (kind !== 'evidence' && selected !== undefined) {
      if (options.select) throw new Error('WORK_READ_SELECT: supply the pointer once');
      options.select = selected;
    }
    return console.log(
      json(await readTask(root, id!, kind!, options, kind === 'evidence' ? selected : undefined)),
    );
  }
  if (command === 'read-result') return console.log(json(await readPublicResult(root, args)));
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
    if (args.length < 1 || args.length > 2) throw new Error(help);
    return console.log(
      `Received draft ${(await receive(root, args[0]!, args[1])).plan.id}; verify authority and evidence before sync.`,
    );
  }
  if (!args[0]) throw new Error(help);
  const { task, raw } = await loadTask(root, args[0]);
  if (command === 'context') {
    if (args.length !== 2) throw new Error(help);
    const reading = await guide(root, args[1]!);
    const inspected = await inspectTask(root, task, raw, args[1]!);
    return console.log(json({ ...inspectionOutput(inspected), ...reading }));
  }
  if (command === 'check') {
    if (args.length !== 1) throw new Error(help);
    const result = await assess(root, task);
    console.log(json(assessmentOutput(task, result, digest(raw))));
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
    if (!assessment.ready) {
      console.error(json(assessmentOutput(task, assessment, digest(raw))));
      process.exitCode = 1;
      return;
    }
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
    console.log(json(assessmentOutput(task, result, digest(json(task)))));
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
  if (!state.ready) {
    console.error(json(assessmentOutput(task, state, digest(raw))));
    process.exitCode = 1;
    return;
  }
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
    if (criterion.id === normsCriterion.id) {
      const issues = await normsIssues(root, task.plan, true);
      if (issues.length) throw new Error(issues.join('\n'));
      if (
        (await normsReviewResult(
          root,
          bytes.toString('utf8'),
          task.plan,
          await capture(root, task),
        )) !== args[2]
      )
        throw new Error('WORK_NORMS_EVIDENCE: declared result disagrees with normative review');
    }
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
  const message = error instanceof Error ? error.message : String(error);
  if (Buffer.byteLength(message) <= 4096) console.error(message);
  else
    console.error(
      json({
        error: [...message].slice(0, 512).join(''),
        incomplete: true,
        sha256: digest(message),
        bytes: Buffer.byteLength(message),
        detail: 'The full exception text was not persisted. Inspect the original request/input.',
      }),
    );
  process.exitCode = 1;
}
