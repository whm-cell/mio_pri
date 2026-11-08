import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { documentCatalog } from '../scripts/harness/task-documents.ts';
import { evidenceSelector, recordsPath } from '../scripts/harness/work/compact-store.ts';
import { outputBytes } from '../scripts/harness/work/output.ts';
import { readPublicResult } from '../scripts/harness/work/public-read.ts';
import { digest, json } from '../scripts/harness/work/records.ts';
import {
  compactRecords,
  evidenceRoot,
  readBook,
  readIndex,
  renderBook,
  renderCompactBook,
  renderIndex,
  renderResultPage,
  reportPath,
  resultFiles,
  resultPath,
} from '../scripts/harness/work/reports.ts';

const project = resolve('.');
const cli = join(project, 'scripts/harness/work/cli.ts');
const scratch: string[] = [];
afterEach(async () => {
  await Promise.all(scratch.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

async function fixture(compact: boolean) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'mio-public-read-')));
  scratch.push(root);
  const catalog = await documentCatalog(project);
  const { index } = await readIndex(project);
  const prd = index.prds[0]!.prd;
  const book = structuredClone((await readBook(project, prd, index)).book);
  book.version = compact ? 4 : 3;
  const artifacts: Record<string, string> = {};
  for (const result of book.results) {
    const originals = await resultFiles(project, result);
    for (const evidence of result.evidence) {
      const bytes = originals[evidence.path]!;
      evidence.path = compact
        ? evidenceSelector(prd, result.key, evidence.criterion)
        : `${evidenceRoot({ prd, key: result.key })}/${evidence.criterion}.md`;
      artifacts[evidence.path] = bytes;
    }
  }
  const files: Record<string, string> = {
    'harness.config.json': json(catalog.config),
    'package.json': '{"type":"module"}\n',
  };
  for (const entry of catalog.documents)
    for (const path of new Set([entry.identity, entry.path, ...(entry.aliases ?? [])]))
      files[path] = await readFile(join(project, path), 'utf8');
  if (compact) {
    const records = compactRecords(book, artifacts);
    files[recordsPath(prd)] = json(records);
    files[reportPath(prd)] = renderCompactBook(records);
  } else {
    const details: Record<string, string> = {};
    for (const result of book.results)
      details[resultPath({ prd, key: result.key })] = renderResultPage(prd, result);
    Object.assign(files, details, artifacts);
    files[reportPath(prd)] = renderBook(book, details);
  }
  files['docs/tasks/index.md'] = renderIndex({
    version: 2,
    prds: [{ prd, report: { path: reportPath(prd), sha256: digest(files[reportPath(prd)]!) } }],
  });
  for (const [path, bytes] of Object.entries(files)) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), bytes);
  }
  return { root, prd, book, artifacts };
}

it.each([false, true])(
  'reads accepted public facts and exact evidence without author records (compact=%s)',
  async (compact) => {
    const { root, prd, book, artifacts } = await fixture(compact);
    await expect(stat(join(root, '.work'))).rejects.toThrow();
    const listing = spawnSync(process.execPath, [cli, 'read-result', prd], {
      cwd: root,
      encoding: 'utf8',
      timeout: 10000,
    });
    expect(listing.status, listing.stderr).toBe(0);
    expect(Buffer.byteLength(listing.stdout)).toBeLessThanOrEqual(outputBytes);
    expect(JSON.parse(listing.stdout).items.map((entry: { key: string }) => entry.key)).toEqual(
      book.results.map((result) => result.key),
    );
    const result = book.results.at(-1)!;
    const acceptance = await readPublicResult(root, [
      prd,
      result.key,
      '--select',
      '/result/acceptance',
    ]);
    expect(acceptance).toMatchObject({
      entries: expect.arrayContaining([{ key: 'candidate', value: result.acceptance!.candidate }]),
    });
    const evidence = result.evidence[0]!;
    let args = [
      'read-result',
      prd,
      result.key,
      '--select',
      `/artifacts/${evidence.criterion}`,
      '--limit',
      '2048',
    ];
    let recovered = '';
    let firstHash = '';
    for (;;) {
      const page = await readPublicResult(root, args.slice(1));
      expect(Buffer.byteLength(json(page))).toBeLessThanOrEqual(outputBytes);
      firstHash ||= page.page.sha256;
      if (!('text' in page) || typeof page.text !== 'string') throw new Error('Expected text page');
      recovered += page.text;
      if (!page.page.next) break;
      args = page.page.next.argv;
    }
    expect(recovered).toBe(artifacts[evidence.path]);
    await expect(
      readPublicResult(root, [prd, result.key, '--hash', '0'.repeat(64)]),
    ).rejects.toThrow('WORK_READ_STALE');
    expect(firstHash).toMatch(/^[a-f0-9]{64}$/);
    await writeFile(join(root, compact ? recordsPath(prd) : evidence.path), 'corrupted');
    await expect(readPublicResult(root, [prd, result.key])).rejects.toThrow();
    await expect(stat(join(root, '.work'))).rejects.toThrow();
  },
  20000,
);
