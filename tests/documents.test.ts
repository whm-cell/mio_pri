import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { checkDocuments } from '../scripts/harness/check-documents.ts';
import { inventory } from '../scripts/harness/inventory.ts';
import type { HarnessConfig } from '../scripts/harness/inventory.ts';
import { headingAnchors, markdownLinks, parseMarkdown } from '../scripts/harness/markdown.ts';

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});
const config: HarnessConfig = {
  sourceRoots: {},
  developmentDependencies: {},
  documentRoots: ['README.md', 'docs'],
  privateRoots: ['.work', '.runtime'],
  generatedRoots: ['.git'],
  configurationFiles: [],
};
const endpoint =
  '## GET /api/session\n\n身份：Cookie。\n\n输入：无正文。\n\n成功：会话或 null。\n\n错误：按本域约定。\n\n副作用：可能刷新会话。\n';
async function fixture(extra: Record<string, string> = {}) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'mio-documents-')));
  roots.push(root);
  for (const [path, text] of Object.entries({
    'README.md': '[资料](docs/index.md)\n',
    'docs/index.md': '[API](apis/index.md) [指南](guide.md#api-使用-1)\n',
    'docs/guide.md': '# Guide\n\n## API 使用\n\n## API 使用\n',
    'docs/apis/index.md': '[认证](auth.md)\n',
    'docs/apis/auth.md': '# Auth\n\n' + endpoint,
    ...extra,
  })) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), text);
  }
  return root;
}
async function errors(root: string) {
  return (await checkDocuments(root, (await inventory(root, config)).files, config)).errors;
}

it('discovers active documents without private records and resolves duplicate, encoded and reference anchors', async () => {
  const root = await fixture({
    'docs/index.md':
      '[API](apis/index.md) [指南][guide]\n\n[guide]: guide.md#api-%E4%BD%BF%E7%94%A8-1\n',
  });
  expect(await errors(root)).toEqual([]);
  const tree = parseMarkdown(
    '# Real\n\n```md\n# Pretend\n```\n\n[ref][x]\n\n[x]: other.md#target\n',
  );
  expect([...headingAnchors(tree)]).toEqual(['real']);
  expect(markdownLinks(tree).links).toContain('other.md#target');
});

it('rejects missing active anchors, undiscoverable pages and an undiscoverable entry', async () => {
  const root = await fixture({
    'docs/guide.md': '# Guide\n\n## Renamed\n',
    'docs/orphan.md': '# Hidden contract\n',
  });
  expect(await errors(root)).toEqual(
    expect.arrayContaining([
      'LINK_ANCHOR docs/index.md: guide.md#api-使用-1',
      'DOCUMENT_UNREACHABLE docs/orphan.md',
    ]),
  );
  await writeFile(join(root, 'README.md'), '# Entry\n');
  expect(await errors(root)).toContain('DOCUMENT_UNREACHABLE docs/index.md');
});

it('retains historic path/privacy checks while exempting historic heading semantics', async () => {
  const path = 'docs/tasks/history/old.md';
  const root = await fixture({
    [path]:
      '[old](../../guide.md#old-version-title) [private](../../../.work/log.md)\n\n/Users/someone/private\n',
  });
  const result = await errors(root);
  expect(result).toContain(`PERSONAL_PATH ${path}`);
  expect(result).toContain(`LINK_PRIVATE ${path}: ../../../.work/log.md`);
  expect(result.some((entry) => entry.startsWith(`LINK_ANCHOR ${path}`))).toBe(false);
  expect(result).not.toContain(`DOCUMENT_UNREACHABLE ${path}`);
});

it('checks unused link definitions and does not discover active contracts through historical prose', async () => {
  const root = await fixture({
    'docs/index.md': '[API](apis/index.md) [Guide](guide.md) [History](tasks/history/old.md)\n',
    'docs/tasks/history/old.md': '[Then-current contract](../../hidden.md)\n',
    'docs/hidden.md': '# Active contract\n',
    'docs/guide.md': '# Guide\n\n[unused]: ../.work/private.md\n',
  });
  const result = await errors(root);
  expect(result).toContain('LINK_PRIVATE docs/guide.md: ../.work/private.md');
  expect(result).toContain('DOCUMENT_UNREACHABLE docs/hidden.md');
});

it('keeps unused and shadowed definitions out of navigation while validating their destinations', async () => {
  const root = await fixture({
    'docs/index.md':
      '[API](apis/index.md) [Guide][chosen]\n\n[unused]: hidden.md\n[chosen]: guide.md\n[chosen]: hidden.md\n',
    'docs/hidden.md': '# Hidden contract\n',
  });
  expect(await errors(root)).toEqual(['DOCUMENT_UNREACHABLE docs/hidden.md']);
});

it('uses decoded, validated navigation paths for API domain discovery', async () => {
  const root = await fixture({ 'docs/apis/index.md': '[Auth](auth%2Emd#auth)\n' });
  expect(await errors(root)).toEqual([]);
});

it('rejects duplicate endpoint identities, malformed locations, missing fields and unlinked API domains', async () => {
  const root = await fixture({
    'docs/apis/other.md': '# Other\n\n' + endpoint + '\n## GTE /bad\n',
    'docs/apis/auth.md': '# Auth\n\n' + endpoint.replace('副作用：可能刷新会话。', ''),
  });
  const result = await errors(root);
  expect(result).toContain('API_DOMAIN_UNLINKED docs/apis/other.md');
  expect(result).toContain('API_FIELD docs/apis/auth.md: GET /api/session: 副作用');
  expect(result.some((entry) => entry.startsWith('API_DUPLICATE GET /api/session'))).toBe(true);
  expect(result).toContain('API_ENDPOINT_INVALID docs/apis/other.md: GTE /bad');
});
