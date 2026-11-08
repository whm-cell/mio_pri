import { spawnSync } from 'node:child_process';
import { format } from 'prettier';
import { artifact, assess } from './context.ts';
import { digest, json, loadTask } from './records.ts';
import type { Task } from './records.ts';
import { commitDelivery, replayDelivery, requestDigest } from './delivery-store.ts';
import { normsIssues } from './norms-review.ts';
import { documentCatalog, requirementsPath, resolvePrd } from '../task-documents.ts';
import {
  evidenceRoot,
  compactRecords,
  hashField,
  indexPath,
  loadBook,
  optionalText,
  parseDraft,
  readBook,
  readDraft,
  readIndex,
  record,
  renderBook,
  renderCompactBook,
  renderDraft,
  renderIndex,
  renderResultPage,
  reportPath,
  resultPath,
  resultFiles,
  textField,
} from './reports.ts';
import type { PublicResult, SharedEvidence } from './reports.ts';
import { evidenceSelector, recordsPath } from './compact-store.ts';

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
async function verified(
  root: string,
  task: Task,
  candidate?: string,
  publishing = false,
  newWrite = true,
) {
  if (publishing && (await optionalText(root, requirementsPath)) === null)
    throw new Error(
      `WORK_DELIVERY_NAVIGATION: create the real ${requirementsPath} navigation before publishing`,
    );
  if (
    task.plan.result &&
    resolvePrd(task.plan.result.prd, await documentCatalog(root)) !== task.plan.result.prd
  )
    throw new Error('WORK_RESULT: reconcile result.prd to its stable identity using work update');
  const assessment = await assess(root, task, false);
  if (!assessment.ready) throw new Error(assessment.errors.join('\n'));
  const normsErrors = await normsIssues(root, task.plan, newWrite);
  if (normsErrors.length) throw new Error(normsErrors.join('\n'));
  if (candidate !== undefined && assessment.candidate !== candidate)
    throw new Error('WORK_DELIVERY_STALE: candidate changed');
  if (assessment.evidence.some((entry) => entry.result !== 'pass'))
    throw new Error('WORK_DELIVERY_EVIDENCE: all criteria need matching passing originals');
  return assessment;
}

export async function deliver(root: string, id: string, rawRequest: string) {
  const { task, raw } = await loadTask(root, id);
  if (!task.plan.result)
    throw new Error(
      'WORK_DELIVERY_RESULT: public complete requires an explicit PRD development result; maintenance stays local and may archive after checking',
    );
  if (task.delivery?.version !== 2)
    throw new Error(
      'WORK_DELIVERY_LEGACY: use update to reconcile plan.result and upgrade the private delivery contract; v1 operations cannot publish new task packages',
    );
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
    await replayDelivery(root, id, token, async (restored, operation) => {
      await verified(
        root,
        restored,
        restored.checkpoint!.candidate,
        operation.kind === 'complete' && !operation.done,
        false,
      );
    })
  ) {
    const restored = (await loadTask(root, id)).task;
    return request.action === 'complete'
      ? { completed: true, replayed: true, report: restored.delivery!.accepted }
      : {
          replayed: true,
          readyForAcceptance: (await assess(root, restored)).readyForAcceptance,
          revision: digest(json(restored)),
          draft: restored.delivery!.draft,
        };
  }
  if (request.revision !== digest(raw)) throw new Error('WORK_CONFLICT: read current revision');
  if (task.archived) throw new Error('WORK_ARCHIVED: reopen before delivery');
  return request.action === 'prepare'
    ? prepare(root, task, raw, request, token)
    : complete(root, task, raw, request, token);
}

async function prepare(
  root: string,
  task: Task,
  raw: string,
  request: Record<string, unknown>,
  token: string,
) {
  await verified(root, task);
  if (!Array.isArray(request.modules) || !request.modules.length)
    throw new Error('WORK_DELIVERY_REQUEST: modules required');
  if (!Array.isArray(request.evidence) || request.evidence.length !== task.plan.acceptance.length)
    throw new Error('WORK_DELIVERY_REQUEST: choose one shared artifact per criterion');
  const directory = `.work/tasks/${task.plan.id}/delivery`;
  const outputs: Record<string, string> = {};
  const shared: SharedEvidence[] = [];
  const { book } = await readBook(root, task.plan.result!.prd, (await readIndex(root)).index);
  for (const value of request.evidence) {
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
    outputs[`${directory}/evidence/${criterion}.md`] = content;
    shared.push({
      criterion,
      method: original.method,
      representation: representation as SharedEvidence['representation'],
      sourceSha256: original.sha256,
      path:
        book.version === 4
          ? evidenceSelector(task.plan.result!.prd, task.plan.result!.key, criterion)
          : `${evidenceRoot(task.plan.result!)}/${criterion}.md`,
      sha256: digest(content),
      environment: original.environment,
    });
  }
  const { candidate, head, files, contract } = task.checkpoint!;
  const draft = {
    version: 2 as const,
    prd: task.plan.result!.prd,
    result: {
      key: task.plan.result!.key,
      title: textField(request.title),
      modules: request.modules.map(textField),
      outcomes: textField(request.outcomes),
      decisions: textField(request.decisions),
      limitations: textField(request.limitations),
      version: { candidate, head, files, contract },
      criteria: task.plan.acceptance,
      evidence: shared,
    },
  };
  const source = publicText(await markdown(renderDraft(draft)));
  parseDraft(source);
  const path = `${directory}/draft.md`;
  outputs[path] = source;
  task.delivery!.draft = { path, sha256: digest(source), candidate };
  task.reviewDecision = 'PENDING';
  task.stage = 'C1_EVIDENCE_PENDING';
  task.releaseDisposition = 'HOLD_FOR_HUMAN_REVIEW';
  task.notes.push(`Prepared private result draft ${digest(source)}; acceptance remains pending.`);
  await commitDelivery(root, task, raw, token, 'prepare', outputs, {});
  return { revision: digest(json(task)), draft: task.delivery!.draft, readyForAcceptance: true };
}

async function preservePrevious(root: string, prd: string, previous: PublicResult) {
  const path = reportPath(prd);
  const result = spawnSync('git', ['show', `HEAD:${path}`], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  let saved: PublicResult | undefined;
  if (result.status === 0) {
    const loaded = await loadBook(result.stdout, async (file) => {
      const bytes = spawnSync('git', ['show', `HEAD:${file}`], {
        cwd: root,
        encoding: 'utf8',
        maxBuffer: 16 * 1024 * 1024,
      });
      return bytes.status === 0 ? bytes.stdout : null;
    });
    saved = loaded.book.results.find((entry) => entry.key === previous.key);
  }
  if (!saved || json(saved) !== json(previous))
    throw new Error(
      `WORK_DELIVERY_HISTORY: commit the previous accepted result before replacing ${previous.key}`,
    );
  await resultFiles(root, previous, async (path) => {
    const bytes = spawnSync('git', ['show', `HEAD:${path}`], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    });
    if (bytes.status !== 0)
      throw new Error(`WORK_DELIVERY_HISTORY: preserve previous evidence ${path}`);
    return bytes.stdout;
  });
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
  await verified(root, task, ref.candidate, true);
  const { draft, attachments } = await readDraft(root, task, ref.candidate);
  const acceptance = record(request.acceptance);
  fields(acceptance, ['candidate', 'statement', 'reference']);
  if (hashField(acceptance.candidate) !== draft.result.version.candidate)
    throw new Error('WORK_DELIVERY_ACCEPTANCE: candidate mismatch');
  draft.result.acceptance = {
    candidate: acceptance.candidate as string,
    statement: textField(acceptance.statement),
    reference: textField(acceptance.reference),
  };
  const { index, source: indexBefore } = await readIndex(root);
  const { book, source: bookBefore, details } = await readBook(root, draft.prd, index);
  if (draft.result.evidence.some((entry) => entry.path.includes('#') !== (book.version === 4)))
    throw new Error('WORK_DELIVERY_STALE: book format changed after preparation');
  if (book.version === 2 && book.results.some((entry) => entry.key !== draft.result.key))
    throw new Error(
      'WORK_DELIVERY_LEGACY: migrate the v2 navigation before publishing alongside sibling results',
    );
  const previous = book.results.find((entry) => entry.key === draft.result.key);
  const previousFiles = previous ? await resultFiles(root, previous) : {};
  if (previous && json(previous) !== json(draft.result))
    await preservePrevious(root, draft.prd, previous);
  const outputs: Record<string, string | null> = book.version === 4 ? {} : { ...attachments };
  const expected: Record<string, string | null> = {};
  if (book.version !== 4)
    for (const path of Object.keys(attachments)) expected[path] = previousFiles[path] ?? null;
  for (const [path, content] of Object.entries(previousFiles)) {
    if (!(path in outputs) && path.startsWith(`${evidenceRoot(task.plan.result!)}/`)) {
      outputs[path] = null;
      expected[path] = content;
    }
  }
  book.results = book.results
    .filter((entry) => entry.key !== draft.result.key)
    .concat(draft.result);
  book.results.sort((a, b) => a.key.localeCompare(b.key));
  const path = reportPath(draft.prd);
  let source: string;
  if (book.version === 4) {
    const records = compactRecords(book, attachments, details[recordsPath(draft.prd)]);
    const bytes = publicText(await format(json(records), { parser: 'json', printWidth: 100 }));
    const storePath = recordsPath(draft.prd);
    outputs[storePath] = bytes;
    expected[storePath] = details[storePath] ?? null;
    details[storePath] = bytes;
    source = publicText(await markdown(renderCompactBook(records, bytes)));
  } else {
    const detail = resultPath(task.plan.result!);
    outputs[detail] = publicText(await markdown(renderResultPage(draft.prd, draft.result)));
    expected[detail] = details[detail] ?? null;
    details[detail] = outputs[detail]!;
    source = publicText(await markdown(renderBook(book, details)));
  }
  await loadBook(source, async (file) => details[file] ?? null);
  outputs[path] = source;
  expected[path] = bookBefore;
  index.prds = index.prds
    .filter((entry) => entry.prd !== draft.prd)
    .concat({ prd: draft.prd, report: { path, sha256: digest(source) } });
  outputs[indexPath] = publicText(await markdown(renderIndex(index)));
  expected[indexPath] = indexBefore;
  const accepted = {
    path,
    key: draft.result.key,
    sha256: digest(json(draft.result)),
    candidate: draft.result.version.candidate,
  };
  task.delivery!.accepted = accepted;
  task.stage = 'C1_RELEASED';
  task.reviewDecision = 'ACCEPT';
  task.releaseDisposition = 'RELEASED';
  task.plan.sharedRef = `${path}#${accepted.key}`;
  task.notes.push(`Accepted ${accepted.candidate}; ${draft.result.acceptance.reference}`);
  await commitDelivery(root, task, raw, token, 'complete', outputs, expected);
  return {
    completed: true,
    revision: digest(json(task)),
    report: accepted,
    files: Object.keys(outputs),
  };
}
