import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { capture, contractIssues } from './context.ts';
import { checkedPath, digest, json, member, parseTask, saveTask } from './records.ts';
import type { Task } from './records.ts';
import { deliveryOutput, parseReport, reportPath } from './reports.ts';
import { draft } from './records.ts';

/** A portable proposal plus candidate manifest; local authority and evidence never transfer implicitly. */
export async function handoff(root: string, task: Task) {
  const current = await capture(root, task);
  if (
    !task.checkpoint ||
    task.checkpoint.candidate !== current.candidate ||
    task.checkpoint.head !== current.head ||
    task.checkpoint.branch !== current.branch
  )
    throw new Error('WORK_HANDOFF_STALE: reconcile before preparing a handoff');
  const incomplete = contractIssues(task).filter((error) => error.startsWith('WORK_CONTRACT'));
  if (incomplete.length) throw new Error(incomplete.join('\n'));
  const plan = task.plan;
  const portable: Task = {
    version: 1,
    member: task.member,
    workspace: '',
    stage: null,
    reviewDecision: 'PENDING',
    releaseDisposition: 'HOLD_FOR_EVIDENCE',
    evidence: [],
    archived: false,
    ...(task.delivery ? { delivery: { version: 1 as const } } : {}),
    checkpoint: task.checkpoint,
    plan: {
      id: plan.id,
      ...(plan.requirement ? { requirement: plan.requirement } : {}),
      goal: plan.goal,
      scope: plan.scope,
      inputs: plan.inputs,
      sources: plan.sources,
      authorization: '',
      nonGoals: plan.nonGoals,
      acceptance: plan.acceptance,
      decisions: plan.decisions,
      dependencies: plan.dependencies,
      blockers: plan.blockers,
      nextAction: plan.nextAction,
      stopCondition: plan.stopCondition,
      sharedRef: plan.sharedRef,
    },
    notes: task.evidence.map(
      (entry) =>
        `Reported ${entry.criterion}: ${entry.result}; candidate ${entry.candidate}; raw evidence must be retrieved or the check rerun.`,
    ),
  };
  const path = await checkedPath(
    root,
    `.work/tasks/${task.plan.id}/handoff-${digest(json(portable)).slice(0, 20)}.md`,
  );
  await mkdir(dirname(path), { recursive: true });
  // Never publish automatically. The operator reviews this file and shares the code and required artifacts separately.
  const markdown = `# Task handoff: ${task.plan.id}\n\nReported by ${task.member}. Verify the pinned code, authorization, dependencies and raw evidence before continuing. This file grants no permission and transfers no code or logs.\n\n\`\`\`mio-work-handoff\n${json(portable)}\`\`\`\n`;
  try {
    await writeFile(path, markdown, { flag: 'wx' });
  } catch (error) {
    if (
      (error as NodeJS.ErrnoException).code !== 'EEXIST' ||
      (await readFile(path, 'utf8')) !== markdown
    )
      throw error;
  }
  return path;
}

export async function receive(root: string, source: string) {
  if (
    !source.endsWith('.md') ||
    (!source.startsWith('.work/inbox/') && !source.startsWith('docs/'))
  )
    throw new Error('WORK_HANDOFF_PATH: retrieve the shared Markdown into .work/inbox/ or docs/');
  const markdown = await readFile(await checkedPath(root, source), 'utf8');
  if (source.startsWith('docs/tasks/complete/') && source.endsWith('/report.md')) {
    const report = parseReport(markdown);
    if (source !== reportPath(report.id))
      throw new Error('WORK_REPORT_FORMAT: task/report location mismatch');
    for (const entry of report.evidence) {
      const bytes = await readFile(await checkedPath(root, `${dirname(source)}/${entry.path}`));
      if (digest(bytes) !== entry.sha256)
        throw new Error('WORK_REPORT_EVIDENCE: shared artifact differs');
    }
    const task = draft(root, await member(root), report.id, report.contract.goal);
    Object.assign(task.plan, report.contract, {
      authorization: '',
      sharedRef: source,
      dependencies: report.contract.dependencies.map((entry) => ({ ...entry, ready: false })),
    });
    task.delivery = {
      version: 1,
      accepted: { path: source, sha256: digest(markdown), candidate: report.checkpoint.candidate },
    };
    const current = await capture(root, task);
    const changed = [
      ...new Set([...Object.keys(current.files), ...Object.keys(report.checkpoint.files)]),
    ].filter(
      (path) =>
        current.files[path] !== report.checkpoint.files[path] &&
        !deliveryOutput(task.plan.id, path),
    );
    task.notes.push(
      `Recovered accepted report ${source} (${digest(markdown)}), tested ${report.checkpoint.candidate}; changed inputs: ${changed.join(', ') || 'none'}. Inspect current requirements and authority; no passes inherited.`,
    );
    await saveTask(root, task);
    return task;
  }
  const blocks = [...markdown.matchAll(/^```mio-work-handoff\r?\n([\s\S]*?)^```\s*$/gm)];
  if (blocks.length !== 1)
    throw new Error('WORK_HANDOFF_FORMAT: expected one mio-work-handoff block');
  const incoming = parseTask(blocks[0]![1]!);
  if (!incoming.checkpoint) throw new Error('WORK_HANDOFF_FORMAT: candidate manifest missing');
  const current = await capture(root, incoming);
  if (json(incoming.checkpoint.files) !== json(current.files))
    throw new Error(
      'WORK_HANDOFF_CODE: required code/documents differ; retrieve the pinned candidate first',
    );
  const task: Task = {
    ...incoming,
    member: await member(root),
    workspace: root,
    stage: null,
    reviewDecision: 'PENDING',
    releaseDisposition: 'HOLD_FOR_EVIDENCE',
    checkpoint: null,
    evidence: [],
    archived: false,
    plan: {
      ...incoming.plan,
      authorization: '',
      dependencies: incoming.plan.dependencies.map((entry) => ({ ...entry, ready: false })),
    },
    notes: [
      ...incoming.notes,
      `Received ${source} from ${incoming.member}; verified file manifest ${incoming.checkpoint.candidate}; source HEAD ${incoming.checkpoint.head ?? 'unborn'}. Reconcile local authority and retrieve required raw evidence.`,
    ],
  };
  await saveTask(root, task);
  return task;
}
