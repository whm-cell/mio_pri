import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { checkDocuments } from '../scripts/harness/check-documents.ts';
import { inventory } from '../scripts/harness/inventory.ts';
import type { HarnessConfig } from '../scripts/harness/inventory.ts';
import { headingAnchors, markdownLinks, parseMarkdown } from '../scripts/harness/markdown.ts';
import { renderIndex } from '../scripts/harness/work/reports.ts';

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
async function errors(root: string, configuration = config) {
  return (await checkDocuments(root, (await inventory(root, configuration)).files, configuration))
    .errors;
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

it('recognizes real compatibility anchors without accepting tags inside HTML comments or scripts', async () => {
  const root = await fixture({
    'docs/index.md': '[API](apis/index.md) [Guide](guide.md#real-anchor)\n',
    'docs/guide.md':
      '# Guide\n\n<a id="real-anchor"></a>\n\n<!-- <a id="comment-anchor"></a> -->\n\n<script>const sample = \'<a id="script-anchor"></a>\';</script>\n',
  });
  expect(await errors(root)).toEqual([]);
  for (const anchor of ['comment-anchor', 'script-anchor']) {
    await writeFile(
      join(root, 'docs/index.md'),
      `[API](apis/index.md) [Guide](guide.md#${anchor})\n`,
    );
    expect(await errors(root)).toContain(`LINK_ANCHOR docs/index.md: guide.md#${anchor}`);
  }
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

const taskConfig: HarnessConfig = {
  ...config,
  taskDocuments: [
    {
      identity: 'docs/old-prd.md',
      kind: 'prd',
      path: 'docs/tasks/example/prd.md',
      aliases: ['docs/old-prd.md'],
    },
  ],
};
async function taskFixture(extra: Record<string, string> = {}) {
  return fixture({
    'docs/index.md': '[API](apis/index.md) [Guide](guide.md) [Tasks](tasks/index.md)\n',
    'docs/tasks/index.md': renderIndex({ version: 2, prds: [] }),
    'docs/tasks/requirements.md': '[Requirement](example/prd.md)\n',
    'docs/tasks/example/prd.md': '# Requirement\n\n## Old section\n',
    'docs/old-prd.md':
      '# 资料已迁移\n\n[当前资料](../docs/tasks/example/prd.md)\n\n- <a id="old-section"></a>[Old section](../docs/tasks/example/prd.md#old-section)\n',
    ...extra,
  });
}

it('classifies task documents and keeps compatibility aliases as navigation leaves with real anchors', async () => {
  const root = await taskFixture();
  expect(await errors(root, taskConfig)).toEqual([]);
  await writeFile(
    join(root, 'docs/old-prd.md'),
    '# 资料已迁移\n\n[当前资料][current]\n\n[current]: ../docs/tasks/example/prd%2Emd?view=1\n',
  );
  expect(await errors(root, taskConfig)).toEqual([]);
  expect(headingAnchors(parseMarkdown('<a id="old-section"></a>\n'))).toContain('old-section');
  await writeFile(
    join(root, 'docs/old-prd.md'),
    '# 资料已迁移\n\n[当前资料](../docs/tasks/example/prd%2Emd?view=1)\n\n- <a id="old-section"></a>[Old section](../docs/tasks/example/prd%2Emd#old-section)\n',
  );
  expect(await errors(root, taskConfig)).toEqual([]);
  // A registered alias is a backward entry, not an alternate way to discover active task prose.
  await writeFile(
    join(root, 'docs/index.md'),
    '[API](apis/index.md) [Guide](guide.md) [Old](old-prd.md)\n',
  );
  expect(await errors(root, taskConfig)).toContain(
    'DOCUMENT_UNREACHABLE docs/tasks/example/prd.md',
  );
});

it('rejects unknown task pages, lost result entries and discovery through historical prose', async () => {
  const root = await taskFixture({
    'docs/tasks/unknown.md': '# Unclassified\n',
    'docs/tasks/index.md': '# Broken result index\n',
    'docs/tasks/history/old.md': '[Tasks](../requirements.md)\n',
    'docs/index.md': '[API](apis/index.md) [Guide](guide.md) [History](tasks/history/old.md)\n',
  });
  expect(await errors(root, taskConfig)).toEqual(
    expect.arrayContaining([
      'TASK_DOCUMENT_UNCLASSIFIED docs/tasks/unknown.md',
      'DOCUMENT_UNREACHABLE docs/tasks/example/prd.md',
      'DOCUMENT_UNREACHABLE docs/tasks/index.md',
    ]),
  );
});

it('does not discover active requirements or current norms through accepted-result prose', async () => {
  const root = await taskFixture({
    'docs/index.md': '[API](apis/index.md) [Guide](guide.md) [Result](tasks/complete/note.md)\n',
    'docs/tasks/complete/note.md': '[Requirements](../requirements.md) [Norm](../../hidden.md)\n',
    'docs/hidden.md': '# Current normative page\n',
  });
  const checked = await errors(root, taskConfig);
  expect(checked).toContain('DOCUMENT_UNREACHABLE docs/tasks/example/prd.md');
  expect(checked).toContain('DOCUMENT_UNREACHABLE docs/hidden.md');
});

it('rejects duplicate identities, current paths and aliases, missing targets, and substantive alias prose', async () => {
  const root = await taskFixture({ 'docs/tasks/another.md': '# Another\n' });
  const first = taskConfig.taskDocuments![0]!;
  for (const entry of [
    { ...first },
    { ...first, identity: 'docs/tasks/example/prd.md', aliases: [] },
    {
      ...first,
      identity: 'docs/tasks/another.md',
      path: 'docs/tasks/another.md',
      aliases: ['docs/old-prd.md'],
    },
  ]) {
    const checked = await errors(root, { ...taskConfig, taskDocuments: [first, entry] });
    expect(checked.some((error) => error.includes('TASK_DOCUMENT_DUPLICATE'))).toBe(true);
  }
  expect(
    (
      await errors(root, {
        ...taskConfig,
        taskDocuments: [
          {
            identity: 'docs/tasks/missing.md',
            kind: 'proposal',
            path: 'docs/tasks/missing.md',
          },
        ],
      })
    ).some((error) => error.includes('TASK_DOCUMENT_INVALID')),
  ).toBe(true);
  await writeFile(
    join(root, 'docs/old-prd.md'),
    '# 资料已迁移\n\n[当前资料](../docs/tasks/example/prd.md)\n\nContinue maintaining a second specification here.\n',
  );
  expect(
    (await errors(root, taskConfig)).some((error) => error.startsWith('TASK_DOCUMENT_REDIRECT')),
  ).toBe(true);
});

it.each([
  '../outside.md',
  '.work/private.md',
  'docs/tasks/../outside.md',
  'docs/tasks/link.md',
  'tasks/wrong.md',
  'docs/tasks/complete/wrong.md',
])('rejects unsafe registered documents %s', async (path) => {
  const root = await taskFixture();
  if (path === 'docs/tasks/link.md')
    await symlink(join(root, 'docs/tasks/example/prd.md'), join(root, path));
  const checked = await errors(root, {
    ...taskConfig,
    taskDocuments: [{ identity: path, kind: 'proposal', path }],
  });
  expect(checked.some((error) => error.startsWith('TASK_DOCUMENT_INVALID'))).toBe(true);
});

it('offers the real read-only documents CLI without a member directory or an automatic migration', async () => {
  const root = await taskFixture();
  const configPath = join(root, 'harness.config.json');
  const raw = JSON.stringify({ ...taskConfig, configurationFiles: ['harness.config.json'] });
  await writeFile(configPath, raw);
  const result = spawnSync(
    process.execPath,
    [resolve('scripts/harness/work/cli.ts'), 'documents'],
    { cwd: root, encoding: 'utf8' },
  );
  expect(result.status, result.stderr).toBe(0);
  expect(JSON.parse(result.stdout)).toEqual({
    documents: [
      {
        kind: 'prd',
        identity: 'docs/old-prd.md',
        currentPath: 'docs/tasks/example/prd.md',
        aliases: ['docs/old-prd.md'],
      },
    ],
    issues: [],
  });
  expect(await readFile(configPath, 'utf8')).toBe(raw);
  await expect(readFile(join(root, '.work/member.json'))).rejects.toHaveProperty('code', 'ENOENT');
});
