import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { format } from 'prettier';
import { artifact, assess, capture } from './context.ts';
import { checkedPath, digest, json, loadTask, saveTask } from './records.ts';
import type { Task } from './records.ts';
import { commitDelivery, replayDelivery, requestDigest } from './delivery-store.ts';
import {
  hashField,
  indexPath,
  optionalText,
  parseReport,
  readIndex,
  record,
  renderIndex,
  renderReport,
  reportPath,
  reportRoot,
  textField,
} from './reports.ts';
import type { Report, SharedEvidence } from './reports.ts';

export const markdown = (text: string) => format(text, { parser: 'markdown', printWidth: 100 });
function publicText(text: string) {
  if (/\/(?:Users|Volumes|home)\//.test(text) || /(?:^|[\s"'(/])\.work\//m.test(text))
    throw new Error('WORK_DELIVERY_PRIVATE: redact personal paths before sharing');
  return text;
}
function fields(obj: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(obj).some((key) => !allowed.includes(key)))
    throw new Error('WORK_DELIVERY_REQUEST: unsupported field');
}

async function verified(root: string, task: Task, candidate?: string) {
  const assessment = await assess(root, task);
  if (!assessment.ready) throw new Error(assessment.errors.join('\n'));
  if (candidate !== undefined && assessment.candidate !== candidate)
    throw new Error('WORK_DELIVERY_STALE: candidate changed');
  if (assessment.evidence.some((entry) => entry.result !== 'pass'))
    throw new Error('WORK_DELIVERY_EVIDENCE: all criteria need matching passing originals');
  return assessment;
}

export async function deliver(root: string, id: string, rawRequest: string) {
  const { task, raw } = await loadTask(root, id);
  const request = record(JSON.parse(rawRequest));
  fields(request, [
    'action',
    'revision',
    'title',
    'modules',
    'outcomes',
    'decisions',
    'limitations',
    'evidence',
    'draftSha256',
    'acceptance',
  ]);
  if (!['prepare', 'complete'].includes(String(request.action)))
    throw new Error('WORK_DELIVERY_REQUEST: action prepare or complete');
  const token = requestDigest(request);
  if (
    request.action === 'complete' &&
    (await replayDelivery(root, id, token, async (task) => {
      await verified(root, task, task.checkpoint!.candidate);
    }))
  )
    return { completed: true, replayed: true, report: reportPath(id) };
  if (request.revision !== digest(raw)) throw new Error('WORK_CONFLICT: read current revision');
  if (task.archived) throw new Error('WORK_ARCHIVED: reopen before delivery');
  if (!task.delivery) {
    if (request.action !== 'prepare')
      throw new Error('WORK_DELIVERY_DISABLED: prepare before collecting evidence');
    const before = await assess(root, task);
    if (!before.ready) throw new Error(before.errors.join('\n'));
    task.delivery = { version: 1 };
    task.stage = 'C1_EVIDENCE_PENDING';
    task.reviewDecision = 'PENDING';
    task.releaseDisposition = 'HOLD_FOR_EVIDENCE';
    task.notes.push(
      'Enabled fixed delivery outputs. Reconcile the new candidate and collect matching evidence.',
    );
    await saveTask(root, task, raw);
    return {
      enabled: true,
      revision: digest(json(task)),
      candidate: (await capture(root, task)).candidate,
      nextAction: 'Inspect and sync the changed contract, then collect evidence and prepare again.',
    };
  }
  if (request.action === 'prepare') return prepare(root, task, raw, request);
  return complete(root, task, raw, request, token);
}

async function prepare(root: string, task: Task, raw: string, request: Record<string, unknown>) {
  if (!task.plan.requirement && !task.plan.sources.length)
    throw new Error('WORK_DELIVERY_SOURCE: name a public requirement or source before preparing');
  await verified(root, task);
  const modules = request.modules;
  if (!Array.isArray(modules) || !modules.length)
    throw new Error('WORK_DELIVERY_REQUEST: modules required');
  const evidence = request.evidence;
  if (!Array.isArray(evidence) || evidence.length !== task.plan.acceptance.length)
    throw new Error('WORK_DELIVERY_REQUEST: choose one shared artifact per criterion');
  const attachments: Record<string, string> = {};
  const shared: SharedEvidence[] = [];
  for (const value of evidence) {
    const selected = record(value);
    fields(selected, ['criterion', 'representation', 'text']);
    const criterion = textField(selected.criterion);
    const original = task.evidence
      .filter(
        (entry) =>
          entry.criterion === criterion &&
          entry.candidate === task.checkpoint!.candidate &&
          entry.method === task.plan.acceptance.find((item) => item.id === criterion)?.method,
      )
      .at(-1);
    if (!original || original.result !== 'pass')
      throw new Error(`WORK_DELIVERY_EVIDENCE: ${criterion}`);
    const bytes = await artifact(root, task.plan.id, original.artifact);
    if (digest(bytes) !== original.sha256)
      throw new Error(`WORK_DELIVERY_EVIDENCE: changed ${criterion}`);
    const representation = selected.representation;
    if (!['original', 'redacted', 'excerpt'].includes(String(representation)))
      throw new Error('WORK_DELIVERY_REQUEST: representation');
    const text = representation === 'original' ? bytes.toString('utf8') : textField(selected.text);
    if (representation === 'original' && !Buffer.from(text, 'utf8').equals(bytes))
      throw new Error('WORK_DELIVERY_TEXT: only UTF-8 evidence is supported');
    publicText(text);
    const fence = '`'.repeat(
      Math.max(3, ...Array.from(text.matchAll(/`+/g), (match) => match[0].length + 1)),
    );
    const content = await markdown(
      `# ${criterion}\n\nRepresentation: ${representation}; original SHA256: ${original.sha256}.\n\n${fence}text\n${text}\n${fence}\n`,
    );
    const path = `evidence/${criterion}.md`;
    attachments[path] = content;
    shared.push({
      criterion,
      method: original.method,
      representation: representation as SharedEvidence['representation'],
      sourceSha256: original.sha256,
      path,
      sha256: digest(content),
      environment: original.environment,
    });
  }
  const p = task.plan;
  const report: Report = {
    version: 1,
    id: p.id,
    title: textField(request.title),
    author: task.member,
    modules: modules.map(textField),
    outcomes: textField(request.outcomes),
    decisions: textField(request.decisions),
    limitations: textField(request.limitations),
    checkpoint: task.checkpoint!,
    contract: {
      ...(p.requirement ? { requirement: p.requirement } : {}),
      goal: p.goal,
      scope: p.scope,
      inputs: p.inputs,
      sources: p.sources,
      nonGoals: p.nonGoals,
      acceptance: p.acceptance,
      decisions: p.decisions,
      dependencies: p.dependencies,
    },
    evidence: shared,
  };
  const source = publicText(await markdown(renderReport(report)));
  parseReport(source, false);
  const directory = `.work/tasks/${p.id}/delivery`;
  const path = `${directory}/draft.md`;
  await mkdir(await checkedPath(root, `${directory}/evidence`), { recursive: true });
  for (const [name, content] of Object.entries(attachments))
    await writeFile(await checkedPath(root, `${directory}/${name}`), content);
  await writeFile(await checkedPath(root, path), source);
  task.delivery!.draft = { path, sha256: digest(source), candidate: report.checkpoint.candidate };
  task.notes.push(`Prepared delivery draft ${digest(source)}; acceptance remains pending.`);
  await saveTask(root, task, raw);
  return { revision: digest(json(task)), draft: task.delivery!.draft, readyForAcceptance: true };
}

async function preservePrevious(root: string, id: string, old: string | null) {
  if (old === null) return;
  const report = parseReport(old);
  // HEAD must preserve the entire previous package; a local uncommitted report is not history.
  for (const [path, expected] of [
    [reportPath(id), digest(old)],
    ...report.evidence.map((entry) => [`${reportRoot(id)}/${entry.path}`, entry.sha256]),
  ] as [string, string][]) {
    const result = spawnSync('git', ['show', `HEAD:${path}`], {
      cwd: root,
      maxBuffer: 16 * 1024 * 1024,
    });
    if (result.status !== 0 || digest(result.stdout) !== expected)
      throw new Error(
        `WORK_DELIVERY_HISTORY: commit the previous accepted package before replacing ${path}`,
      );
    const current = await optionalText(root, path);
    if (current === null || digest(current) !== expected)
      throw new Error(`WORK_DELIVERY_CONFLICT: previous artifact changed ${path}`);
  }
}

async function complete(
  root: string,
  task: Task,
  raw: string,
  request: Record<string, unknown>,
  token: string,
) {
  const ref = task.delivery!.draft;
  if (!ref || request.draftSha256 !== ref.sha256)
    throw new Error('WORK_DELIVERY_STALE: prepare and review the current draft');
  await verified(root, task, ref.candidate);
  const source = await readFile(await checkedPath(root, ref.path), 'utf8');
  if (digest(source) !== ref.sha256) throw new Error('WORK_DELIVERY_STALE: draft bytes changed');
  const report = parseReport(source, false);
  const acceptance = record(request.acceptance);
  fields(acceptance, ['candidate', 'statement', 'reference']);
  if (hashField(acceptance.candidate) !== report.checkpoint.candidate)
    throw new Error('WORK_DELIVERY_ACCEPTANCE: candidate mismatch');
  report.acceptance = {
    candidate: acceptance.candidate as string,
    statement: textField(acceptance.statement),
    reference: textField(acceptance.reference),
  };
  const outputs: Record<string, string | null> = {};
  for (const entry of report.evidence) {
    const original = task.evidence
      .filter(
        (item) =>
          item.criterion === entry.criterion &&
          item.method === entry.method &&
          item.candidate === report.checkpoint.candidate,
      )
      .at(-1);
    if (
      !original ||
      original.sha256 !== entry.sourceSha256 ||
      original.environment !== entry.environment
    )
      throw new Error('WORK_DELIVERY_STALE: evidence changed after draft preparation');
    const content = await readFile(
      await checkedPath(root, `.work/tasks/${task.plan.id}/delivery/${entry.path}`),
      'utf8',
    );
    if (digest(content) !== entry.sha256)
      throw new Error(`WORK_DELIVERY_EVIDENCE: draft attachment changed ${entry.path}`);
    outputs[`${reportRoot(task.plan.id)}/${entry.path}`] = publicText(content);
  }
  const previous = await optionalText(root, reportPath(task.plan.id));
  await preservePrevious(root, task.plan.id, previous);
  if (previous !== null)
    for (const entry of parseReport(previous).evidence) {
      const path = `${reportRoot(task.plan.id)}/${entry.path}`;
      if (!(path in outputs)) outputs[path] = null;
    }
  const publicReport = publicText(await markdown(renderReport(report)));
  outputs[reportPath(task.plan.id)] = publicReport;
  const { index, source: indexBefore } = await readIndex(root);
  const existing = index.tasks.find((entry) => entry.id === task.plan.id);
  if (
    (previous === null && existing?.report) ||
    (previous !== null && existing?.report?.sha256 !== digest(previous))
  )
    throw new Error('WORK_DELIVERY_CONFLICT: index/previous report mismatch');
  const accepted = {
    path: reportPath(task.plan.id),
    sha256: digest(publicReport),
    candidate: report.checkpoint.candidate,
  };
  const entry = {
    id: task.plan.id,
    title: report.title,
    modules: report.modules,
    requirement: task.plan.requirement?.source ?? task.plan.sources.join(', '),
    status: 'complete' as const,
    report: accepted,
  };
  index.tasks = index.tasks.filter((item) => item.id !== task.plan.id).concat(entry);
  outputs[indexPath] = await markdown(renderIndex(index));
  task.delivery!.accepted = accepted;
  task.stage = 'C1_RELEASED';
  task.reviewDecision = 'ACCEPT';
  task.releaseDisposition = 'RELEASED';
  task.plan.sharedRef = accepted.path;
  task.notes.push(`Accepted ${accepted.candidate}; ${report.acceptance.reference}`);
  await commitDelivery(root, task, raw, token, 'complete', outputs, {
    [indexPath]: indexBefore,
    [reportPath(task.plan.id)]: previous,
  });
  return {
    completed: true,
    revision: digest(json(task)),
    report: accepted,
    files: Object.keys(outputs),
  };
}

export async function reopenDelivery(root: string, task: Task, raw: string, request: unknown) {
  const { index, source: indexBefore } = await readIndex(root);
  const entry = index.tasks.find((item) => item.id === task.plan.id);
  if (!entry?.report) {
    await saveTask(root, task, raw);
    return;
  }
  const source = await optionalText(root, entry.report.path);
  if (source === null || digest(source) !== entry.report.sha256)
    throw new Error('WORK_DELIVERY_CONFLICT: reconcile last accepted report');
  entry.status = 'reopened';
  await commitDelivery(
    root,
    task,
    raw,
    requestDigest(request),
    'reopen',
    {
      [indexPath]: await markdown(renderIndex(index)),
    },
    { [indexPath]: indexBefore },
  );
}

export async function replayReopen(root: string, id: string, request: unknown) {
  return replayDelivery(root, id, requestDigest(request), async (task, operation) => {
    const current = await capture(root, task);
    // A reopen may change the plan; compare file bytes, not the previous contract.
    if (json(current.files) !== json(operation.inputs))
      throw new Error('WORK_DELIVERY_STALE: inputs changed during reopen; reconcile operation');
  });
}
