import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { assess, capture } from '../scripts/harness/work/context.ts';
import { deliver, markdown } from '../scripts/harness/work/delivery.ts';
import {
  commitDelivery,
  loadOperation,
  operationPath,
  requestDigest,
} from '../scripts/harness/work/delivery-store.ts';
import { handoff, receive } from '../scripts/harness/work/handoff.ts';
import { updateTask } from '../scripts/harness/work/manage.ts';
import {
  checkReports,
  evidenceRoot,
  indexPath,
  parseBook,
  parseDraft,
  parseIndex,
  readBook,
  readIndex,
  resultPath,
  renderResultPage,
  renderDraft,
  renderBook,
  renderIndex,
  reportPath,
} from '../scripts/harness/work/reports.ts';
import type { PublicResult } from '../scripts/harness/work/reports.ts';
import {
  historicalPath,
  legacyFiles,
  parseLegacyIndex,
  parseReport,
} from '../scripts/harness/work/legacy-reports.ts';
import {
  digest,
  draft,
  initializeMember,
  json,
  loadTask,
  parseTask,
  saveTask,
} from '../scripts/harness/work/records.ts';
import { checkDocuments } from '../scripts/harness/check-documents.ts';
import { inventory, loadConfig } from '../scripts/harness/inventory.ts';
import { documentCatalog, resolveDocument } from '../scripts/harness/task-documents.ts';
import { reviewFixture, reviewMarkdown } from './quality-review-fixture.ts';

const project = resolve('.');
const prd = 'docs/prd.md';
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
  // This fixture models a repository without this project's task-document registry.
  const configPath = join(root, 'harness.config.json');
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  delete config.taskDocuments;
  await writeFile(configPath, JSON.stringify(config));
  for (const [file, text] of Object.entries({
    'package.json': '{"type":"module"}\n',
    '.gitignore': '.work/\n',
    'AGENTS.md': '# Development\n',
    'README.md': '[Documentation](docs/index.md)\n',
    'docs/index.md':
      '[PRD](prd.md) [Other](other-prd.md) [API](api.md) [Foundation](foundation.md) [Acceptance](acceptance.md) [Coordination](coordination.md) [Records](work-records.md) [Results](tasks/index.md) [Tooling](engineering/work-tooling.md)\n',
    'docs/engineering/work-tooling.md': '# Coordinating tools\n\n## v2 公共成果存储维护\n',
    'docs/api.md': '# API\n',
    'docs/foundation.md': '# Foundation\n',
    'docs/acceptance.md': '# Acceptance\n',
    [prd]: '# Capability PRD\n',
    'docs/other-prd.md': '# Other PRD\n',
    [indexPath]: renderIndex({ version: 2, prds: [] }),
    'docs/tasks/requirements.md': '[PRD](../prd.md) [Other PRD](../other-prd.md)\n',
    'src/value.ts': 'export const value = 1;\n',
  })) {
    await mkdir(dirname(join(root, file)), { recursive: true });
    await writeFile(join(root, file), text);
  }
  expect(spawnSync('git', ['init', '-q', '-b', 'main'], { cwd: root }).status).toBe(0);
  await initializeMember(root, 'alice');
  return root;
}
async function results(root: string, source = prd) {
  return (await readBook(root, source, (await readIndex(root)).index)).book;
}
async function legacyBook(root: string) {
  const { index } = await readIndex(root);
  const { book, details } = await readBook(root, prd, index);
  const source = await markdown(
    `# Legacy accepted results\n\n\`\`\`mio-prd-results\n${json({ ...book, version: 2 })}\`\`\`\n`,
  );
  await writeFile(join(root, reportPath(prd)), source);
  index.prds.find((entry) => entry.prd === prd)!.report.sha256 = digest(source);
  await writeFile(join(root, indexPath), await markdown(renderIndex(index)));
  for (const path of Object.keys(details)) await rm(join(root, path));
  return parseBook(source);
}
async function setup(root: string, id = 'probe', key: string | null = id, source = prd) {
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
  if (key !== null) {
    task.plan.result = { prd: source, key };
    task.plan.norms = {
      version: 2,
      paths: ['docs/api.md'],
      reason: 'Fixture capability preserves this API.',
    };
    task.plan.acceptance.push({
      id: 'norms-review',
      method: 'review',
      criterion: 'Review fixture norms.',
    });
    task.delivery = { version: 2 };
  }
  task.checkpoint = await capture(root, task);
  task.stage = 'C0_READY';
  await saveTask(root, task);
  await passing(root, id);
}
async function passing(root: string, id = 'probe') {
  const { task, raw } = await loadTask(root, id);
  task.checkpoint = await capture(root, task);
  const artifact = `.work/tasks/${id}/evidence/checks-${task.evidence.length}.log`;
  await mkdir(dirname(join(root, artifact)), { recursive: true });
  await writeFile(join(root, artifact), 'Observed fixture capability\n');
  task.evidence.push({
    criterion: 'checks',
    method: 'automated',
    result: 'pass',
    candidate: task.checkpoint.candidate,
    artifact,
    sha256: digest('Observed fixture capability\n'),
    summary: 'Fixture observation',
    environment: 'isolated fixture',
  });
  const review = reviewMarkdown(reviewFixture(task.checkpoint.candidate));
  const path = `.work/tasks/${id}/evidence/review-${task.evidence.length}.md`;
  await writeFile(join(root, path), review);
  task.evidence.push({
    criterion: 'quality-review',
    method: 'review',
    result: 'pass',
    candidate: task.checkpoint.candidate,
    artifact: path,
    sha256: digest(review),
    summary: 'Fixture quality review',
    environment: 'isolated fixture',
  });
  if (task.plan.norms) {
    const sourcePath = task.plan.result
      ? resolveDocument(task.plan.result.prd, await documentCatalog(root)).currentPath
      : undefined;
    const report = `# Fixture norms review\n\n\`\`\`mio-norms-review\n${json({
      candidate: task.checkpoint.candidate,
      reviewer: 'isolated fixture reviewer',
      reason: task.plan.norms.reason,
      ...(task.plan.norms.version === 2
        ? {
            version: 2,
            requirements: {
              result: 'pass',
              assessment:
                'Fixture PRD is the declared capability source; there is no separate design.',
              documents: sourcePath
                ? [
                    {
                      path: sourcePath,
                      sha256: task.checkpoint!.files[sourcePath],
                      assessment: 'Synthetic fixture capability covers this PRD.',
                    },
                  ]
                : [],
            },
            accepted: {
              result: 'pass',
              assessment:
                'Synthetic fixture observations only; existing accepted candidates are not reinterpreted.',
              results: [],
            },
            remaining: 'No remaining fixture decisions; real acceptance is separate.',
          }
        : {}),
      documents: task.plan.norms.paths.map((path) => ({
        path,
        sha256: task.checkpoint!.files[path],
        ...(task.plan.norms!.version === 2 ? { result: 'pass' } : {}),
        assessment: 'Fixture API and behavior agree.',
      })),
      conclusion: { result: 'pass', evidence: 'Synthetic fixture observation, not a real review.' },
      limitations: 'Tests the binding protocol only.',
    })}\`\`\`\n`;
    const artifact = `.work/tasks/${id}/evidence/norms-${task.evidence.length}.md`;
    await writeFile(join(root, artifact), report);
    task.evidence.push({
      criterion: 'norms-review',
      method: 'review',
      result: 'pass',
      candidate: task.checkpoint.candidate,
      artifact,
      sha256: digest(report),
      summary: 'Fixture norms review',
      environment: 'isolated fixture',
    });
  }
  task.stage = 'C1_EVIDENCE_PENDING';
  task.reviewDecision = 'PENDING';
  task.releaseDisposition = 'HOLD_FOR_EVIDENCE';
  await saveTask(root, task, raw);
}
async function prepareRequest(root: string, id = 'probe') {
  return {
    action: 'prepare',
    revision: digest((await loadTask(root, id)).raw),
    title: 'Capability query',
    modules: ['capability'],
    outcomes: 'Returns the requested capability.',
    decisions: 'Use the existing API.',
    limitations: 'Fixture only.',
    evidence: (await loadTask(root, id)).task.plan.acceptance.map((item) => ({
      criterion: item.id,
      representation: 'original',
    })),
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

/** Build a valid pre-v2-norms journal through the existing store, without bypassing new-write gates in deliver. */
async function legacyNormsOperation(root: string, kind: 'prepare' | 'complete') {
  await setup(root);
  let loaded = await loadTask(root, 'probe');
  delete loaded.task.plan.norms!.version;
  await saveTask(root, loaded.task, loaded.raw);
  await passing(root);
  loaded = await loadTask(root, 'probe');
  const task = loaded.task;
  const prepared = await prepareRequest(root);
  const outputs: Record<string, string> = {};
  const attachments: Record<string, string> = {};
  const shared = [];
  for (const criterion of task.plan.acceptance) {
    const entry = task.evidence
      .filter(
        (value) =>
          value.criterion === criterion.id && value.candidate === task.checkpoint!.candidate,
      )
      .at(-1)!;
    const text = await readFile(join(root, entry.artifact), 'utf8');
    const path = `${evidenceRoot(task.plan.result!)}/${criterion.id}.md`;
    outputs[`.work/tasks/probe/delivery/evidence/${criterion.id}.md`] = text;
    attachments[path] = text;
    shared.push({
      criterion: criterion.id,
      method: entry.method,
      representation: 'original' as const,
      sourceSha256: entry.sha256,
      path,
      sha256: digest(text),
      environment: entry.environment,
    });
  }
  const { candidate, head, files, contract } = task.checkpoint!;
  const result: PublicResult = {
    key: 'probe',
    title: prepared.title,
    modules: prepared.modules,
    outcomes: prepared.outcomes,
    decisions: prepared.decisions,
    limitations: prepared.limitations,
    version: { candidate, head, files, contract },
    criteria: task.plan.acceptance,
    evidence: shared,
  };
  const source = await markdown(renderDraft({ version: 2, prd, result }));
  const path = '.work/tasks/probe/delivery/draft.md';
  outputs[path] = source;
  task.delivery!.draft = { path, sha256: digest(source), candidate };
  task.releaseDisposition = 'HOLD_FOR_HUMAN_REVIEW';
  await commitDelivery(root, task, loaded.raw, requestDigest(prepared), 'prepare', outputs, {});
  if (kind === 'prepare') return prepared;
  const request = await completeRequest(root);
  loaded = await loadTask(root, 'probe');
  result.acceptance = request.acceptance;
  const detail = resultPath(task.plan.result!);
  const details = { [detail]: await markdown(renderResultPage(prd, result)) };
  const book = await markdown(renderBook({ version: 3, prd, results: [result] }, details));
  const publicOutputs = {
    ...attachments,
    ...details,
    [reportPath(prd)]: book,
    [indexPath]: await markdown(
      renderIndex({
        version: 2,
        prds: [{ prd, report: { path: reportPath(prd), sha256: digest(book) } }],
      }),
    ),
  };
  loaded.task.delivery!.accepted = {
    path: reportPath(prd),
    key: 'probe',
    sha256: digest(json(result)),
    candidate,
  };
  loaded.task.stage = 'C1_RELEASED';
  loaded.task.reviewDecision = 'ACCEPT';
  loaded.task.releaseDisposition = 'RELEASED';
  await commitDelivery(
    root,
    loaded.task,
    loaded.raw,
    requestDigest(request),
    'complete',
    publicOutputs,
    {},
  );
  return request;
}

async function publicFiles(root: string) {
  const files = (await inventory(root, await loadConfig(root))).files;
  return Object.fromEntries(
    await Promise.all(
      files
        .filter((path) => path.startsWith('docs/tasks/'))
        .map(async (path) => [path, digest(await readFile(join(root, path)))]),
    ),
  );
}
function invoke(root: string, args: string[], input?: unknown) {
  return spawnSync(process.execPath, [join(project, 'scripts/harness/work/cli.ts'), ...args], {
    cwd: root,
    encoding: 'utf8',
    input: input === undefined ? undefined : json(input),
  });
}
function commit(root: string, omit?: string) {
  expect(spawnSync('git', ['add', '.'], { cwd: root }).status).toBe(0);
  if (omit) expect(spawnSync('git', ['rm', '--cached', omit], { cwd: root }).status).toBe(0);
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

it('prepares only private, usable evidence links and publishes a candidate-bound result only after acceptance', async () => {
  const root = await fixture();
  await setup(root);
  const before = await publicFiles(root);
  const candidate = (await loadTask(root, 'probe')).task.checkpoint!.candidate;
  const request = await prepareRequest(root);
  expect(await deliver(root, 'probe', json(request))).toMatchObject({ readyForAcceptance: true });
  expect(await publicFiles(root)).toEqual(before);
  const { task } = await loadTask(root, 'probe');
  const bytes = await readFile(join(root, task.delivery!.draft!.path), 'utf8');
  expect(parseDraft(bytes).result.version.candidate).toBe(candidate);
  expect(bytes).toContain('[公开依据](evidence/checks.md)');
  expect(
    await readFile(
      join(dirname(join(root, task.delivery!.draft!.path)), 'evidence/checks.md'),
      'utf8',
    ),
  ).toContain('Observed fixture capability');
  expect(await assess(root, task)).toMatchObject({
    readyForAcceptance: true,
    releaseDisposition: 'HOLD_FOR_HUMAN_REVIEW',
  });
  expect(JSON.parse(invoke(root, ['status']).stdout).tasks[0].assessment.readyForAcceptance).toBe(
    true,
  );
  expect(await deliver(root, 'probe', json(request))).toMatchObject({
    replayed: true,
    readyForAcceptance: true,
  });
  const complete = await completeRequest(root);
  await expect(
    deliver(root, 'probe', json({ ...complete, acceptance: undefined })),
  ).rejects.toThrow();
  expect(await publicFiles(root)).toEqual(before);
  await deliver(root, 'probe', json(complete));
  expect(await readFile(join(root, indexPath), 'utf8')).toContain(
    '[需求、设计与候选](requirements.md)',
  );
  expect(await deliver(root, 'probe', json(complete))).toMatchObject({ replayed: true });
  const book = await results(root);
  expect(book.results).toHaveLength(1);
  expect(book.results[0]).not.toHaveProperty('author');
  expect(book.results[0]).not.toHaveProperty('contract');
  expect(book.results[0]!.version).not.toHaveProperty('branch');
  const accepted = (await loadTask(root, 'probe')).task;
  expect(accepted.delivery!.accepted!.sha256).toBe(digest(json(book.results[0])));
  expect((await capture(root, accepted)).candidate).toBe(candidate);
  for (const [path] of Object.entries(await publicFiles(root))) {
    const text = await readFile(join(root, path), 'utf8');
    expect(await markdown(text)).toBe(text);
  }
  const copy = await fixture();
  await cp(join(root, 'docs/tasks'), join(copy, 'docs/tasks'), { recursive: true });
  await rm(join(copy, '.work'), { recursive: true });
  const files = (await inventory(copy, await loadConfig(copy))).files;
  expect(await checkReports(copy, files)).toEqual([]);
  expect((await checkDocuments(copy, files, await loadConfig(copy))).errors).toEqual([]);
});

it('keeps two task results in one PRD entry without committing the first or changing its accepted binding', async () => {
  const root = await fixture();
  await setup(root, 'first', 'alpha');
  await finish(root, 'first');
  const old = (await results(root)).results[0];
  const ref = (await loadTask(root, 'first')).task.delivery!.accepted;
  await setup(root, 'second', 'beta');
  await finish(root, 'second');
  const book = await results(root);
  expect(book.results.map((entry) => entry.key)).toEqual(['alpha', 'beta']);
  expect(book.results[0]).toEqual(old);
  expect((await loadTask(root, 'first')).task.delivery!.accepted).toEqual(ref);
  expect(parseIndex(await readFile(join(root, indexPath), 'utf8')).prds).toHaveLength(1);
  expect(await checkReports(root, Object.keys(await publicFiles(root)))).toEqual([]);
  await setup(root, 'third', 'alpha', 'docs/other-prd.md');
  await finish(root, 'third');
  expect(parseIndex(await readFile(join(root, indexPath), 'utf8')).prds).toHaveLength(2);
});

it('creates accessible Markdown links for a PRD path containing spaces, Chinese and reserved characters', async () => {
  const root = await fixture();
  const source = 'docs/产品 [v1] (#?).md';
  await writeFile(join(root, source), '# Isolated product requirements\n');
  await writeFile(
    join(root, 'docs/index.md'),
    (await readFile(join(root, 'docs/index.md'), 'utf8')) +
      `\n[Special](${encodeURIComponent(source.slice(5))})\n`,
  );
  await setup(root, 'special', 'capability', source);
  await finish(root, 'special');
  interface MarkdownNode {
    type: string;
    url?: string;
    value?: string;
    children?: MarkdownNode[];
  }
  for (const path of [indexPath, reportPath(source)]) {
    const markdown = await readFile(join(root, path), 'utf8');
    const links: MarkdownNode[] = [];
    const visit = (node: MarkdownNode): void => {
      if (node.type === 'link') links.push(node);
      node.children?.forEach(visit);
    };
    visit(unified().use(remarkParse).parse(markdown) as MarkdownNode);
    const link = links.find(
      (entry) =>
        resolve(dirname(join(root, path)), decodeURIComponent(entry.url!)) === join(root, source),
    );
    expect(link).toBeDefined();
    expect(link!.children?.map((node) => node.value ?? '').join('')).toBe(source);
    expect(
      await readFile(resolve(dirname(join(root, path)), decodeURIComponent(link!.url!)), 'utf8'),
    ).toContain('Isolated product requirements');
  }
  const files = (await inventory(root, await loadConfig(root))).files;
  expect((await checkDocuments(root, files, await loadConfig(root))).errors).toEqual([]);
});

it('reopens privately and replaces only a recoverable key, even with an uncommitted sibling result', async () => {
  const root = await fixture();
  await setup(root, 'first', 'alpha');
  await finish(root, 'first');
  const oldBytes = await readFile(join(root, reportPath(prd)), 'utf8');
  const oldCandidate = (await results(root)).results[0]!.version.candidate;
  let loaded = await loadTask(root, 'first');
  const originalEvidence = loaded.task.evidence;
  await updateTask(
    root,
    'first',
    json({
      revision: digest(loaded.raw),
      reason: 'Fixture requests repair.',
      reopen: true,
      plan: { authorization: 'Fixture user requests repair.' },
    }),
  );
  expect(await readFile(join(root, reportPath(prd)), 'utf8')).toBe(oldBytes);
  await passing(root, 'first');
  await prepare(root, 'first');
  await expect(deliver(root, 'first', json(await completeRequest(root, 'first')))).rejects.toThrow(
    'WORK_DELIVERY_HISTORY',
  );
  commit(root);
  await setup(root, 'second', 'beta');
  await finish(root, 'second');
  const sibling = (await results(root)).results.find((entry) => entry.key === 'beta');
  await writeFile(join(root, 'src/value.ts'), 'export const value = 2;\n');
  await passing(root, 'first');
  await finish(root, 'first');
  const book = await results(root);
  expect(book.results.find((entry) => entry.key === 'beta')).toEqual(sibling);
  expect(book.results.find((entry) => entry.key === 'alpha')!.version.candidate).not.toBe(
    oldCandidate,
  );
  expect(
    spawnSync('git', ['show', `HEAD:${reportPath(prd)}`], { cwd: root, encoding: 'utf8' }).stdout,
  ).toBe(oldBytes);
  loaded = await loadTask(root, 'first');
  expect(loaded.task.evidence.slice(0, originalEvidence.length)).toEqual(originalEvidence);
  for (const entry of originalEvidence)
    expect(digest(await readFile(join(root, entry.artifact)))).toBe(entry.sha256);
});

it('keeps maintenance local and archives its retained evidence without any public delivery', async () => {
  const root = await fixture();
  await setup(root, 'maintenance', null);
  const before = await publicFiles(root);
  const loaded = await loadTask(root, 'maintenance');
  expect((await assess(root, loaded.task)).ready).toBe(true);
  for (const action of ['prepare', 'complete'])
    await expect(
      deliver(root, 'maintenance', json({ action, revision: digest(loaded.raw) })),
    ).rejects.toThrow('WORK_DELIVERY_RESULT');
  expect(await publicFiles(root)).toEqual(before);
  const archived = invoke(root, [
    'archive',
    'maintenance',
    'Verified maintenance; no PRD development result.',
  ]);
  expect(archived.status, archived.stderr).toBe(0);
  expect((await loadTask(root, 'maintenance')).task).toMatchObject({
    archived: true,
    evidence: loaded.task.evidence,
  });
  for (const entry of loaded.task.evidence)
    expect(digest(await readFile(join(root, entry.artifact)))).toBe(entry.sha256);
  expect(await publicFiles(root)).toEqual(before);
});

it('rejects replacement when HEAD contains the old result but not its required evidence', async () => {
  const root = await fixture();
  await setup(root);
  await finish(root);
  const old = (await results(root)).results[0]!;
  commit(root, old.evidence[0]!.path);
  const loaded = await loadTask(root, 'probe');
  await updateTask(
    root,
    'probe',
    json({
      revision: digest(loaded.raw),
      reason: 'Fixture repair after incomplete historical commit.',
      reopen: true,
      plan: { authorization: 'Fixture user authorizes repair.' },
    }),
  );
  await passing(root);
  await prepare(root);
  await expect(deliver(root, 'probe', json(await completeRequest(root)))).rejects.toThrow(
    'WORK_DELIVERY_HISTORY: preserve previous evidence',
  );
  expect((await results(root)).results[0]).toEqual(old);
});

it('rejects missing, changed and orphaned public bytes without consulting the author records', async () => {
  const root = await fixture();
  await setup(root);
  await finish(root);
  const evidence = (await results(root)).results[0]!.evidence[0]!.path;
  await rm(join(root, '.work'), { recursive: true });
  for (const path of [indexPath, reportPath(prd), resultPath({ prd, key: 'probe' }), evidence]) {
    const original = await readFile(join(root, path), 'utf8');
    await writeFile(join(root, path), original + 'Human edit');
    expect(await checkReports(root, Object.keys(await publicFiles(root)))).not.toEqual([]);
    await rm(join(root, path));
    expect(await checkReports(root, Object.keys(await publicFiles(root)))).not.toEqual([]);
    await writeFile(join(root, path), original);
  }
  const orphan = `${evidenceRoot({ prd, key: 'probe' })}/orphan.md`;
  await writeFile(join(root, orphan), 'Unlinked evidence');
  expect(await checkReports(root, Object.keys(await publicFiles(root)))).toEqual([
    `WORK_REPORT_ORPHAN: ${orphan}`,
  ]);
  await rm(join(root, orphan));
  expect(await checkReports(root, Object.keys(await publicFiles(root)))).toEqual([]);
  const index = await readFile(join(root, indexPath), 'utf8');
  await writeFile(join(root, indexPath), index + '\n\n');
  expect(await checkReports(root, Object.keys(await publicFiles(root)))).toEqual([]);
});

it('withdraws readiness for changed code, damaged originals, modified private attachments or drafts, and mismatched acceptance', async () => {
  const root = await fixture();
  await setup(root);
  await prepare(root);
  const { task } = await loadTask(root, 'probe');
  const request = await completeRequest(root);
  await expect(
    deliver(
      root,
      'probe',
      json({ ...request, acceptance: { ...request.acceptance, candidate: 'a'.repeat(64) } }),
    ),
  ).rejects.toThrow('candidate mismatch');
  for (const path of [
    'src/value.ts',
    task.evidence[0]!.artifact,
    '.work/tasks/probe/delivery/evidence/checks.md',
    task.delivery!.draft!.path,
  ]) {
    const previous = await readFile(join(root, path), 'utf8');
    await writeFile(join(root, path), previous + 'changed');
    expect((await assess(root, task)).readyForAcceptance).toBe(false);
    await expect(deliver(root, 'probe', json(request))).rejects.toThrow();
    await writeFile(join(root, path), previous);
  }
  expect((await assess(root, task)).readyForAcceptance).toBe(true);
});

it.each([0, 1, 2, 3, 4, 5])(
  'recovers private preparation interrupted after %i writes',
  async (cut) => {
    const root = await fixture();
    await setup(root);
    const request = await prepareRequest(root);
    await deliver(root, 'probe', json(request));
    const { operation } = (await loadOperation(root, 'probe'))!;
    expect(operation.changes).toHaveLength(5);
    operation.done = false;
    for (let i = 0; i < operation.changes.length; i++) {
      const change = operation.changes[i]!;
      const bytes = i < cut ? change.after : change.before;
      if (bytes === null) await rm(join(root, change.path), { force: true });
      else await writeFile(join(root, change.path), bytes);
    }
    await writeFile(join(root, operationPath('probe')), json(operation));
    expect((await assess(root, (await loadTask(root, 'probe')).task)).readyForAcceptance).toBe(
      false,
    );
    const replay = invoke(root, ['deliver', 'probe', '--stdin'], request);
    expect(replay.status, replay.stderr).toBe(0);
    expect(JSON.parse(replay.stdout).readyForAcceptance).toBe(true);
    expect((await loadOperation(root, 'probe'))!.operation.done).toBe(true);
    expect((await assess(root, (await loadTask(root, 'probe')).task)).readyForAcceptance).toBe(
      true,
    );
    expect(parseIndex(await readFile(join(root, indexPath), 'utf8')).prds).toEqual([]);
  },
);

it.each([0, 1, 2, 3, 4, 5, 6, 7])(
  'recovers completion interrupted after %i writes without duplicate results',
  async (cut) => {
    const root = await fixture();
    await setup(root);
    const request = await finish(root);
    const { operation } = (await loadOperation(root, 'probe'))!;
    expect(operation.changes).toHaveLength(7);
    operation.done = false;
    for (let i = 0; i < operation.changes.length; i++) {
      const change = operation.changes[i]!;
      const bytes = i < cut ? change.after : change.before;
      if (bytes === null) await rm(join(root, change.path), { force: true });
      else await writeFile(join(root, change.path), bytes);
    }
    await writeFile(join(root, operationPath('probe')), json(operation));
    const replay = invoke(root, ['deliver', 'probe', '--stdin'], request);
    expect(replay.status, replay.stderr).toBe(0);
    expect((await results(root)).results).toHaveLength(1);
    expect((await assess(root, (await loadTask(root, 'probe')).task)).ready).toBe(true);
  },
);

it('preserves interfering public edits and refuses all other record writes during an unfinished journal', async () => {
  const root = await fixture();
  await setup(root);
  const request = await finish(root);
  const { operation } = (await loadOperation(root, 'probe'))!;
  operation.done = false;
  await writeFile(join(root, operation.changes.at(-1)!.path), operation.changes.at(-1)!.before!);
  await writeFile(join(root, operationPath('probe')), json(operation));
  const manual = (await readFile(join(root, indexPath), 'utf8')) + '\nHuman note.\n';
  await writeFile(join(root, indexPath), manual);
  await expect(deliver(root, 'probe', json(request))).rejects.toThrow('WORK_DELIVERY_CONFLICT');
  const current = await loadTask(root, 'probe');
  await expect(saveTask(root, current.task, current.raw)).rejects.toThrow('WORK_DELIVERY_PENDING');
  expect(await readFile(join(root, indexPath), 'utf8')).toBe(manual);
});

it('does not replay another workspace journal or rewrite a completed output restored by a person', async () => {
  const a = await fixture();
  await setup(a);
  const request = await finish(a);
  const b = await fixture();
  await rm(join(b, '.work'), { recursive: true });
  await cp(join(a, '.work'), join(b, '.work'), { recursive: true });
  await expect(deliver(b, 'probe', json(request))).rejects.toThrow(/WORK_(OWNER|MEMBER)/);
  const { operation } = (await loadOperation(a, 'probe'))!;
  const change = operation.changes.find((entry) => entry.path === indexPath)!;
  await writeFile(join(a, indexPath), change.before!);
  await expect(deliver(a, 'probe', json(request))).rejects.toThrow('completed output changed');
  expect(await readFile(join(a, indexPath), 'utf8')).toBe(change.before);
});

it.each(['begin', 'finish'])(
  'preserves a journal edit at the %s compare-and-write boundary',
  async (boundary) => {
    const root = await fixture();
    await setup(root);
    await prepare(root);
    const store = pathToFileURL(join(project, 'scripts/harness/work/delivery-store.ts')).href;
    const records = pathToFileURL(join(project, 'scripts/harness/work/records.ts')).href;
    const script = `
    import fs from 'node:fs/promises';
    import { syncBuiltinESMExports } from 'node:module';
    import { resolve } from 'node:path';
    import { commitDelivery, operationPath } from ${JSON.stringify(store)};
    import { digest, json, loadTask } from ${JSON.stringify(records)};
    const root = process.cwd();
    const { task, raw } = await loadTask(root, 'probe');
    const journal = resolve(root, operationPath('probe'));
    const originalRead = fs.readFile;
    const originalRename = fs.rename;
    let injected = false;
    let external;
    if (${JSON.stringify(boundary)} === 'begin') {
      fs.readFile = async function(path, ...args) {
        const bytes = await originalRead.call(this, path, ...args);
        if (String(path) === journal && !injected) {
          injected = true;
          external = json({ ...JSON.parse(bytes.toString()), reviewerNote: 'Preserve this external edit' });
          await fs.writeFile(journal, external);
        }
        return bytes;
      };
    } else {
      fs.rename = async function(from, to) {
        await originalRename.call(this, from, to);
        if (String(to) === resolve(root, '.work/tasks/probe/state.json') && !injected) {
          injected = true;
          external = json({ ...JSON.parse(await originalRead(journal, 'utf8')), reviewerNote: 'Preserve this external edit' });
          await fs.writeFile(journal, external);
        }
      };
    }
    syncBuiltinESMExports();
    task.notes.push('New fixture preparation');
    let error;
    try { await commitDelivery(root, task, raw, digest('fixture next request'), 'prepare', {}, {}); }
    catch (caught) { error = String(caught); }
    finally { fs.readFile = originalRead; fs.rename = originalRename; syncBuiltinESMExports(); }
    console.log(json({ injected, error, preserved: (await fs.readFile(journal, 'utf8')) === external }));
  `;
    const observed = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd: root,
      encoding: 'utf8',
    });
    expect(observed.status, observed.stderr).toBe(0);
    expect(JSON.parse(observed.stdout)).toMatchObject({
      injected: true,
      error: expect.stringContaining('WORK_DELIVERY_CONFLICT'),
      preserved: true,
    });
  },
);

it('receives a selected public result without the author records, authority, scope or passing evidence', async () => {
  const sender = await fixture();
  await setup(sender, 'first', 'alpha');
  await finish(sender, 'first');
  await setup(sender, 'second', 'beta');
  await finish(sender, 'second');
  const receiver = await fixture();
  await cp(join(sender, 'docs/tasks'), join(receiver, 'docs/tasks'), { recursive: true });
  await writeFile(join(receiver, 'src/value.ts'), 'export const value = 99;\n');
  await expect(receive(receiver, reportPath(prd))).rejects.toThrow('WORK_RESULT_SELECTION');
  const command = invoke(receiver, ['receive', reportPath(prd), 'alpha']);
  expect(command.status, command.stderr).toBe(0);
  const id = `alpha-${digest(json([prd, 'alpha'])).slice(0, 16)}`;
  const { task } = await loadTask(receiver, id);
  expect(task).toMatchObject({
    checkpoint: null,
    evidence: [],
    reviewDecision: 'PENDING',
    plan: { authorization: '', scope: [], result: { prd, key: 'alpha' } },
  });
  expect(task.notes.join(' ')).toContain('src/value.ts');
  expect((await assess(receiver, task)).ready).toBe(false);
  await expect(receive(receiver, reportPath(prd), 'alpha')).rejects.toThrow();
});

it('keeps result classification in exact-code handoffs and binds sibling evidence as an input', async () => {
  const sender = await fixture();
  await setup(sender);
  await finish(sender);
  const receiver = await fixture();
  await cp(join(sender, 'docs/tasks'), join(receiver, 'docs/tasks'), { recursive: true });
  const portable = await handoff(sender, (await loadTask(sender, 'probe')).task);
  await mkdir(join(receiver, '.work/inbox'), { recursive: true });
  await cp(portable, join(receiver, '.work/inbox/task.md'));
  const task = await receive(receiver, '.work/inbox/task.md');
  expect(task.delivery).toEqual({ version: 2 });
  expect(task.plan.result).toEqual({ prd, key: 'probe' });
  expect(task.evidence).toEqual([]);
  expect(task.plan.authorization).toBe('');
  await setup(sender, 'sibling', 'beta');
  await finish(sender, 'sibling');
  await passing(sender);
  const loaded = await loadTask(sender, 'probe');
  const before = loaded.task.checkpoint!.candidate;
  const sibling = `${evidenceRoot({ prd, key: 'beta' })}/checks.md`;
  await writeFile(join(sender, sibling), 'Human change');
  expect((await capture(sender, loaded.task)).candidate).not.toBe(before);
  expect(await checkReports(sender, Object.keys(await publicFiles(sender)))).not.toEqual([]);
});

it('rejects malformed result targets and upgrades a reopened v1 task without transferring its old passes', async () => {
  const root = await fixture();
  await setup(root, 'legacy', null);
  let loaded = await loadTask(root, 'legacy');
  for (const result of [
    { prd },
    { prd, key: 1 },
    { prd: '.work/private.md', key: 'capability' },
    { prd: 'tasks/wrong.md', key: 'capability' },
  ]) {
    await expect(
      updateTask(
        root,
        'legacy',
        json({ revision: digest(loaded.raw), reason: 'Invalid fixture', plan: { result } }),
      ),
    ).rejects.toThrow();
  }
  expect(() => parseTask(json({ ...loaded.task, delivery: { version: 2 } }))).toThrow(
    'WORK_SCHEMA',
  );
  loaded.task.delivery = {
    version: 1,
    accepted: {
      path: 'docs/tasks/complete/legacy/report.md',
      sha256: 'a'.repeat(64),
      candidate: loaded.task.checkpoint!.candidate,
    },
  };
  await saveTask(root, loaded.task, loaded.raw);
  loaded = await loadTask(root, 'legacy');
  await expect(
    deliver(root, 'legacy', json({ action: 'complete', revision: digest(loaded.raw) })),
  ).rejects.toThrow('WORK_DELIVERY_RESULT');
  const oldEvidence = loaded.task.evidence;
  await updateTask(
    root,
    'legacy',
    json({
      revision: digest(loaded.raw),
      reason: 'Actual fixture result resumes.',
      reopen: true,
      plan: {
        authorization: 'Fixture authorizes development repair.',
        result: { prd, key: 'capability' },
        norms: { paths: ['docs/api.md'], reason: 'Fixture capability preserves this API.' },
      },
    }),
  );
  loaded = await loadTask(root, 'legacy');
  expect(loaded.task.delivery).toEqual({ version: 2 });
  expect(loaded.task.evidence).toEqual(oldEvidence);
  await expect(prepare(root, 'legacy')).rejects.toThrow('WORK_CONTEXT_CHANGED');
  await passing(root, 'legacy');
  await finish(root, 'legacy');
  expect((await results(root)).results[0]!.key).toBe('capability');
});

it('retains all ten original accepted packages and their immutable v1 index without private author data', async () => {
  const source = await readFile(join(project, 'docs/tasks/history/index.md'), 'utf8');
  expect(digest(source)).toBe('1cd60b5eec05e759e33cc4035d260dab56e1f51d73409d31ed1d2916e335193e');
  const index = parseLegacyIndex(source);
  expect(index.tasks).toHaveLength(10);
  const files = await legacyFiles(project);
  expect(files.size).toBe(46);
  for (const entry of index.tasks) {
    const bytes = await readFile(join(project, historicalPath(entry.report!.path)), 'utf8');
    const report = parseReport(bytes);
    expect(digest(bytes)).toBe(entry.report!.sha256);
    expect(report.acceptance!.candidate).toBe(entry.report!.candidate);
  }
});

it('reads v2 public results and preserves old accepted identity through an uncommitted storage split and same-key repair', async () => {
  const root = await fixture();
  await setup(root);
  await finish(root);
  const before = await legacyBook(root);
  const accepted = (await loadTask(root, 'probe')).task.delivery!.accepted;
  commit(root);
  const details: Record<string, string> = {};
  for (const result of before.results) {
    const path = resultPath({ prd, key: result.key });
    details[path] = await markdown(renderResultPage(prd, result));
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), details[path]!);
  }
  const source = await markdown(renderBook(before, details));
  await writeFile(join(root, reportPath(prd)), source);
  const { index } = await readIndex(root);
  index.prds.find((entry) => entry.prd === prd)!.report.sha256 = digest(source);
  await writeFile(join(root, indexPath), await markdown(renderIndex(index)));
  expect((await results(root)).results).toEqual(before.results);
  expect((await loadTask(root, 'probe')).task.delivery!.accepted).toEqual(accepted);
  expect(digest(json((await results(root)).results[0]))).toBe(accepted!.sha256);
  const loaded = await loadTask(root, 'probe');
  await updateTask(
    root,
    'probe',
    json({
      revision: digest(loaded.raw),
      reason: 'Fixture repair after a storage-only split',
      reopen: true,
      plan: { authorization: 'Fixture user authorizes repair' },
    }),
  );
  await writeFile(join(root, 'src/value.ts'), 'export const value = 2;\n');
  await passing(root);
  await finish(root);
  expect((await results(root)).results).toHaveLength(1);
  expect((await results(root)).results[0]!.version.candidate).not.toBe(
    before.results[0]!.version.candidate,
  );
});

it('refuses implicit v2 sibling migration before any public write and still receives a selected legacy result', async () => {
  const sender = await fixture();
  await setup(sender, 'first', 'alpha');
  await finish(sender, 'first');
  await setup(sender, 'second', 'beta');
  await finish(sender, 'second');
  const old = await legacyBook(sender);
  const receiver = await fixture();
  await cp(join(sender, 'docs/tasks'), join(receiver, 'docs/tasks'), { recursive: true });
  const received = await receive(receiver, reportPath(prd), 'alpha');
  expect(received.evidence).toEqual([]);
  expect(received.plan.authorization).toBe('');
  await passing(sender, 'first');
  await prepare(sender, 'first');
  const before = await publicFiles(sender);
  await expect(
    deliver(sender, 'first', json(await completeRequest(sender, 'first'))),
  ).rejects.toThrow('migrate the v2 navigation');
  expect(await publicFiles(sender)).toEqual(before);
  expect((await results(sender)).results).toEqual(old.results);
});

it('binds sibling detail inputs while excluding only the selected result page', async () => {
  const root = await fixture();
  await setup(root, 'first', 'alpha');
  await finish(root, 'first');
  await setup(root, 'second', 'beta');
  await finish(root, 'second');
  await passing(root, 'first');
  const { task } = await loadTask(root, 'first');
  expect(task.checkpoint!.files).toHaveProperty(resultPath({ prd, key: 'beta' }));
  expect(task.checkpoint!.files).not.toHaveProperty(resultPath({ prd, key: 'alpha' }));
  await writeFile(join(root, resultPath({ prd, key: 'beta' })), 'Interfering sibling edit\n');
  expect((await capture(root, task)).candidate).not.toBe(task.checkpoint!.candidate);
  expect(await checkReports(root, Object.keys(await publicFiles(root)))).not.toEqual([]);
});

async function movedPrd(root: string, kind = 'prd') {
  const path = 'docs/tasks/example/prd.md';
  await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, path), await readFile(join(root, prd), 'utf8'));
  await writeFile(join(root, prd), `# 资料已迁移\n\n[当前资料](../${path})\n`);
  const configPath = join(root, 'harness.config.json');
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  config.taskDocuments = [{ identity: prd, kind, path, aliases: [prd] }];
  await writeFile(configPath, JSON.stringify(config));
  return path;
}

it('resolves old and new PRD paths to the same immutable accepted book while receive compares historical physical files', async () => {
  const root = await fixture();
  await setup(root);
  await finish(root);
  const originalIndex = await readFile(join(root, indexPath), 'utf8');
  const originalBook = await readFile(join(root, reportPath(prd)), 'utf8');
  const old = (await results(root)).results[0]!;
  const moved = await movedPrd(root);
  expect(await results(root, moved)).toEqual(await results(root, prd));
  expect((await results(root)).results[0]).toEqual(old);
  const files = (await inventory(root, await loadConfig(root))).files;
  await rm(join(root, '.work'), { recursive: true });
  expect(await checkReports(root, files)).toEqual([]);
  await initializeMember(root, 'bob');
  const received = await receive(root, reportPath(prd), 'probe');
  expect(received.plan.result).toEqual({ prd, key: 'probe' });
  expect(received.notes.join(' ')).toContain(prd);
  expect(received.notes.join(' ')).toContain('Differences among the historical manifest paths:');
  expect(received.evidence).toEqual([]);
  expect(await readFile(join(root, indexPath), 'utf8')).toBe(originalIndex);
  expect(await readFile(join(root, reportPath(prd)), 'utf8')).toBe(originalBook);
  const configPath = join(root, 'harness.config.json');
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  config.taskDocuments[0].identity = moved;
  await writeFile(configPath, JSON.stringify(config));
  await expect(results(root, moved)).rejects.toThrow(
    'accepted PRD must remain a registry identity',
  );
  expect((await checkReports(root, files)).join()).toContain('WORK_REPORT_BINDING');
});

it('rechecks current PRD classification before any new delivery, while preserving historical parsing', async () => {
  const root = await fixture();
  await setup(root);
  await movedPrd(root, 'design');
  await passing(root);
  await expect(prepare(root)).rejects.toThrow('WORK_RESULT');
  expect((await readIndex(root)).index.prds).toEqual([]);
});

it('stores a new docs/tasks PRD result in the same docs/tasks/complete root and protects orphans', async () => {
  const root = await fixture();
  const source = 'docs/tasks/new/prd.md';
  await mkdir(dirname(join(root, source)), { recursive: true });
  await writeFile(join(root, source), '# New requirement\n');
  const configPath = join(root, 'harness.config.json');
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  config.taskDocuments = [{ identity: source, kind: 'prd', path: source }];
  await writeFile(configPath, JSON.stringify(config));
  await setup(root, 'new-result', 'feature', source);
  await finish(root, 'new-result');
  expect(reportPath(source)).toMatch(/^docs\/tasks\/complete\//);
  expect((await results(root, source)).results[0]?.key).toBe('feature');
  let files = (await inventory(root, await loadConfig(root))).files;
  expect(await checkReports(root, files)).toEqual([]);
  const orphan = `${evidenceRoot({ prd: source, key: 'feature' })}/orphan.md`;
  await writeFile(join(root, orphan), 'Unlinked new result evidence.');
  files = (await inventory(root, await loadConfig(root))).files;
  expect((await checkReports(root, files)).join()).toContain(`WORK_REPORT_ORPHAN: ${orphan}`);
});

it('blocks missing norms and stale norm originals without promoting or editing normative pages at complete', async () => {
  const root = await fixture();
  await setup(root);
  let loaded = await loadTask(root, 'probe');
  delete loaded.task.plan.norms;
  loaded.task.plan.acceptance = loaded.task.plan.acceptance.filter(
    (item) => item.id !== 'norms-review',
  );
  loaded.task.checkpoint = await capture(root, loaded.task);
  await saveTask(root, loaded.task, loaded.raw);
  const legacy = (await loadTask(root, 'probe')).raw;
  await expect(prepare(root)).rejects.toThrow('WORK_NORMS_CONTRACT');
  expect((await loadTask(root, 'probe')).raw).toBe(legacy);
  await updateTask(
    root,
    'probe',
    json({
      revision: digest(legacy),
      reason: 'Explicitly reconcile the affected current API.',
      plan: {
        norms: { paths: ['docs/api.md'], reason: 'The current API covers the fixture result.' },
      },
    }),
  );
  await passing(root);
  const api = await readFile(join(root, 'docs/api.md'), 'utf8');
  await prepare(root);
  await writeFile(
    join(root, 'docs/api.md'),
    api + '\nUpdated normative body before verification.\n',
  );
  const changedRequest = await completeRequest(root);
  await expect(deliver(root, 'probe', json(changedRequest))).rejects.toThrow(
    'WORK_CONTEXT_CHANGED',
  );
  await passing(root);
  await finish(root);
  expect(await readFile(join(root, 'docs/api.md'), 'utf8')).toBe(
    api + '\nUpdated normative body before verification.\n',
  );
  loaded = await loadTask(root, 'probe');
  const norms = loaded.task.evidence.filter((item) => item.criterion === 'norms-review');
  expect(new Set(norms.map((item) => item.candidate)).size).toBeGreaterThan(1);
});

it.each([
  ['prepare', false],
  ['prepare', true],
  ['complete', false],
  ['complete', true],
] as const)(
  'keeps legacy norms %s replay compatible with interrupted=%s while gating new requests',
  async (kind, interrupted) => {
    const root = await fixture();
    const request = await legacyNormsOperation(root, kind);
    const { operation } = (await loadOperation(root, 'probe'))!;
    const candidate = (await loadTask(root, 'probe')).task.checkpoint!.candidate;
    if (interrupted) {
      operation.done = false;
      for (const change of operation.changes.slice(2)) {
        if (change.before === null) await rm(join(root, change.path), { force: true });
        else await writeFile(join(root, change.path), change.before);
      }
      await writeFile(join(root, operationPath('probe')), json(operation));
    }
    const replay = invoke(root, ['deliver', 'probe', '--stdin'], request);
    expect(replay.status, replay.stderr).toBe(0);
    expect(JSON.parse(replay.stdout).replayed).toBe(true);
    const current = await loadTask(root, 'probe');
    expect(current.task.plan.norms?.version).toBeUndefined();
    expect(current.task.checkpoint!.candidate).toBe(candidate);
    for (const change of operation.changes)
      expect(await readFile(join(root, change.path), 'utf8')).toBe(change.after);
    if (kind === 'complete') {
      const files = (await inventory(root, await loadConfig(root))).files;
      expect(await checkReports(root, files)).toEqual([]);
      expect((await results(root)).results[0]?.version.candidate).toBe(candidate);
      expect((await assess(root, current.task)).normsReview.result).toBe('pass');
    } else {
      const assessment = await assess(root, current.task);
      expect(JSON.parse(replay.stdout).readyForAcceptance).toBe(false);
      expect(assessment.readyForAcceptance).toBe(false);
      expect(assessment.normsReview.result).toBe('pass');
      expect(assessment.normsReview.issues.join()).toContain('plan.norms.version 2');
    }
    await expect(prepare(root)).rejects.toThrow('plan.norms.version 2');
    await expect(deliver(root, 'probe', json(await completeRequest(root)))).rejects.toThrow(
      'plan.norms.version 2',
    );
    expect((await loadTask(root, 'probe')).raw).toBe(current.raw);
    const acceptedBytes = await publicFiles(root);
    await updateTask(
      root,
      'probe',
      json({
        revision: digest(current.raw),
        reason: 'Explicitly upgrade this active fixture before a new delivery.',
        plan: { norms: current.task.plan.norms },
      }),
    );
    await passing(root);
    await prepare(root);
    expect((await assess(root, (await loadTask(root, 'probe')).task)).readyForAcceptance).toBe(
      true,
    );
    expect(await publicFiles(root)).toEqual(acceptedBytes);
  },
);

const oldIndexBody = (source: string) =>
  source.replace(
    '# 任务资料与成果\n\n[需求、设计与候选](requirements.md)：按当前目标展开相关任务资料。',
    '# PRD 成果索引',
  );

it('reads only complete old or new canonical index templates and preserves activity navigation on complete', async () => {
  const root = await fixture();
  const current = await readFile(join(root, indexPath), 'utf8');
  const old = oldIndexBody(current);
  expect(old).not.toBe(current);
  for (const source of [old, current]) {
    await writeFile(join(root, indexPath), source);
    expect((await readIndex(root)).index).toEqual({ version: 2, prds: [] });
    await writeFile(join(root, indexPath), source + '\nForged acceptance body.\n');
    await expect(readIndex(root)).rejects.toThrow('WORK_REPORT_INTEGRITY');
  }
  await writeFile(join(root, indexPath), old);
  await setup(root);
  await finish(root);
  const published = await readFile(join(root, indexPath), 'utf8');
  expect(published).toContain('[需求、设计与候选](requirements.md)');
  expect((await readIndex(root)).index.prds[0]?.prd).toBe(prd);
});

it('rejects a first completion without real activity navigation instead of publishing a dangling index', async () => {
  const root = await fixture();
  await setup(root);
  let loaded = await loadTask(root, 'probe');
  loaded.task.plan.scope = ['src'];
  await saveTask(root, loaded.task, loaded.raw);
  await passing(root);
  await prepare(root);
  const navigation = await readFile(join(root, 'docs/tasks/requirements.md'), 'utf8');
  await rm(join(root, 'docs/tasks/requirements.md'));
  const indexBefore = await readFile(join(root, indexPath), 'utf8');
  const request = await completeRequest(root);
  await expect(deliver(root, 'probe', json(request))).rejects.toThrow('WORK_DELIVERY_NAVIGATION');
  expect(await readFile(join(root, indexPath), 'utf8')).toBe(indexBefore);
  await expect(readFile(join(root, reportPath(prd)))).rejects.toHaveProperty('code', 'ENOENT');
  await writeFile(join(root, 'docs/tasks/requirements.md'), navigation);
  await deliver(root, 'probe', json(request));
  loaded = await loadTask(root, 'probe');
  expect(loaded.task.stage).toBe('C1_RELEASED');
});

it('rechecks activity navigation on unfinished completion replay without changing the original journal', async () => {
  const root = await fixture();
  await setup(root);
  const loaded = await loadTask(root, 'probe');
  loaded.task.plan.scope = ['src'];
  await saveTask(root, loaded.task, loaded.raw);
  await passing(root);
  const request = await finish(root);
  const { operation } = (await loadOperation(root, 'probe'))!;
  operation.done = false;
  for (const change of operation.changes) {
    if (change.before === null) await rm(join(root, change.path), { force: true });
    else await writeFile(join(root, change.path), change.before);
  }
  const journal = json(operation);
  await writeFile(join(root, operationPath('probe')), journal);
  const navigation = await readFile(join(root, 'docs/tasks/requirements.md'), 'utf8');
  await rm(join(root, 'docs/tasks/requirements.md'));
  await expect(deliver(root, 'probe', json(request))).rejects.toThrow('WORK_DELIVERY_NAVIGATION');
  expect(await readFile(join(root, operationPath('probe')), 'utf8')).toBe(journal);
  expect(await readFile(join(root, indexPath), 'utf8')).toBe(
    operation.changes.find((change) => change.path === indexPath)!.before,
  );
  await writeFile(join(root, 'docs/tasks/requirements.md'), navigation);
  expect(await deliver(root, 'probe', json(request))).toMatchObject({
    completed: true,
    replayed: true,
  });
  expect(await readFile(join(root, indexPath), 'utf8')).toBe(
    operation.changes.find((change) => change.path === indexPath)!.after,
  );
});

it('preserves byte conflicts between canonical index templates during journal recovery', async () => {
  const root = await fixture();
  await setup(root);
  const request = await finish(root);
  const { operation } = (await loadOperation(root, 'probe'))!;
  operation.done = false;
  const indexChange = operation.changes.find((change) => change.path === indexPath)!;
  const old = oldIndexBody(indexChange.before!);
  await writeFile(join(root, indexPath), old);
  const stateChange = operation.changes.at(-1)!;
  await writeFile(join(root, stateChange.path), stateChange.before!);
  const journal = json(operation);
  await writeFile(join(root, operationPath('probe')), journal);
  expect((await readIndex(root)).index.prds).toEqual([]);
  await expect(deliver(root, 'probe', json(request))).rejects.toThrow('WORK_DELIVERY_CONFLICT');
  expect(await readFile(join(root, indexPath), 'utf8')).toBe(old);
  expect(await readFile(join(root, operationPath('probe')), 'utf8')).toBe(journal);
  await writeFile(join(root, indexPath), indexChange.before!);
  await deliver(root, 'probe', json(request));
  expect(await readFile(join(root, indexPath), 'utf8')).toBe(indexChange.after);
});
