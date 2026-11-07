import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import ts from 'typescript';
import { afterEach, expect, it } from 'vitest';

const project = resolve('.');
const scratch: string[] = [];
afterEach(async () => {
  await Promise.all(scratch.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

async function fixture(extra: Record<string, string>) {
  const root = await mkdtemp(join(tmpdir(), 'mio-guard-'));
  scratch.push(root);
  await cp(join(project, 'harness.config.json'), join(root, 'harness.config.json'));
  // This fixture models a repository without this project's task-document registry.
  const configPath = join(root, 'harness.config.json');
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  delete config.taskDocuments;
  await writeFile(configPath, JSON.stringify(config));
  await cp(join(project, 'tsconfig.json'), join(root, 'tsconfig.json'));
  await cp(join(project, 'tsconfig.build.json'), join(root, 'tsconfig.build.json'));
  for (const [file, text] of Object.entries({
    'README.md': '# Fixture\n',
    'src/value.ts': 'export const value = 1;\n',
    ...extra,
  })) {
    await mkdir(dirname(join(root, file)), { recursive: true });
    await writeFile(join(root, file), text);
  }
  return root;
}

function check(root: string) {
  const result = spawnSync(
    process.execPath,
    [join(project, 'scripts/harness/check-guardrails.ts'), root],
    {
      encoding: 'utf8',
    },
  );
  return { status: result.status, output: `${result.stdout}\n${result.stderr}` };
}

it('works without personal records; reports a long, low-branch function without blocking it', async () => {
  const root = await fixture({
    'src/long.ts': `export function list() {\nreturn [\n${Array.from({ length: 320 }, (_, i) => `${i},`).join('\n')}\n];\n}\n`,
    'src/new-file.ts': "import { value } from './value.ts';\nexport const next = value + 1;\n",
    '.work/unselected.md': '[ignored](absent-file)\n',
  });
  const result = check(root);
  expect(result.output).toContain('longestFunction=324');
  expect(result.output).toContain('decisionNodes=0');
  expect(result.status, result.output).toBe(0);
});

it.each([
  ['unsupported extension', { 'src/worker.py': 'print(1)' }, 'SOURCE_UNSUPPORTED'],
  [
    'extensionless source',
    { 'scripts/harness/worker': '#!/usr/bin/env node\nconsole.log(1)' },
    'SOURCE_UNSUPPORTED',
  ],
  ['unclassified new module', { 'worker/run.ts': 'export const run = 1;' }, 'FILE_UNCLASSIFIED'],
  [
    'unsupported top-level task area',
    { 'tasks/wrong.md': '# Wrong task location' },
    'FILE_UNCLASSIFIED',
  ],
  [
    'framework crossing',
    { 'src/other.ts': "export type { Context } from '@deepseek-ai/cordis';" },
    'DSH_BOUNDARY',
  ],
  [
    'runtime imports tooling',
    {
      'src/other.ts': "import '../scripts/harness/tool.ts';",
      'scripts/harness/tool.ts': 'export {};',
    },
    'RUNTIME_DEPENDENCY',
  ],
  [
    'dynamic execution',
    { 'src/other.ts': "import { exec } from 'node:child_process';\nexport { exec };" },
    'RUNTIME_CAPABILITY',
  ],
  ['private document link', { 'README.md': '[private](.work/note.md)' }, 'LINK_PRIVATE'],
  [
    'broken reference link',
    { 'README.md': '[missing][target]\n\n[target]: missing.md' },
    'LINK_MISSING',
  ],
  [
    'circular dependency',
    {
      'src/a.ts': "export { b } from './b.ts';",
      'src/b.ts': "import './a.ts'; export const b = 1;",
    },
    'IMPORT_CYCLE',
  ],
] as const)('rejects %s with an actionable nonzero result', async (_name, files, diagnostic) => {
  const result = check(await fixture(files));
  expect(result.status, result.output).toBe(1);
  expect(result.output).toContain(diagnostic);
});

it.each(['src/other.ts', 'src/plugin.ts'])(
  'checks a valid framework paths alias in %s and preserves local aliases and import-like text',
  async (file) => {
    const root = await fixture({
      'package.json': JSON.stringify({ type: 'module' }),
      [file]: "export type { Context } from 'runtime-alias';",
      'src/local.ts': `export { value } from 'local-alias';
// import '@deepseek-ai/not-a-package';
export const documentation = "import '@deepseek-ai/not-a-package'";`,
    });
    await symlink(join(project, 'node_modules'), join(root, 'node_modules'), 'dir');
    const manifestPath = createRequire(import.meta.url).resolve('@deepseek-ai/cordis/package.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as { types: string };
    const configPath = join(root, 'tsconfig.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.compilerOptions.paths = {
      'runtime-alias': [join(dirname(manifestPath), manifest.types)],
      'local-alias': ['./src/value.ts'],
    };
    await writeFile(configPath, JSON.stringify(config));
    const parsed = ts.parseJsonConfigFileContent(config, ts.sys, root);
    expect(parsed.errors).toEqual([]);
    const diagnostics = ts.getPreEmitDiagnostics(
      ts.createProgram(parsed.fileNames, parsed.options),
    );
    expect(
      diagnostics.map((item) => ts.flattenDiagnosticMessageText(item.messageText, '\n')),
    ).toEqual([]);
    const result = check(root);
    expect(result.status, result.output).toBe(file === 'src/plugin.ts' ? 0 : 1);
    if (file !== 'src/plugin.ts') expect(result.output).toContain(`DSH_BOUNDARY ${file}`);
  },
);

it.each([
  ['@deepseek-ai/cordis', 'directory'],
  ['@example/library', 'directory'],
  ['@deepseek-ai/cordis', 'file'],
  ['@example/library', 'file'],
] as const)(
  'checks the owning package %s through a %s symlink with an unrelated package or directory name',
  async (name, link) => {
    const root = await fixture({
      'package.json': JSON.stringify({ type: 'module' }),
      '.runtime/vendor/package.json': JSON.stringify({ name, version: '1.0.0', type: 'module' }),
      '.runtime/vendor/lib/index.d.ts': 'export interface Context { id: string }',
      'src/other.ts': "export type { Context } from 'runtime-alias';",
    });
    await mkdir(join(root, 'node_modules'));
    const configPath = join(root, 'tsconfig.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.compilerOptions.types = [];
    if (link === 'directory') {
      await symlink(join(root, '.runtime/vendor'), join(root, 'node_modules/indirect'), 'dir');
      config.compilerOptions.paths = {
        'runtime-alias': ['./node_modules/indirect/lib/index.d.ts'],
      };
    } else {
      await mkdir(join(root, 'node_modules/runtime-alias/lib'), { recursive: true });
      await writeFile(
        join(root, 'node_modules/runtime-alias/package.json'),
        JSON.stringify({
          name: '@example/wrapper',
          version: '1.0.0',
          type: 'module',
          types: 'lib/index.d.ts',
        }),
      );
      await symlink(
        join(root, '.runtime/vendor/lib/index.d.ts'),
        join(root, 'node_modules/runtime-alias/lib/index.d.ts'),
      );
    }
    await writeFile(configPath, JSON.stringify(config));
    const parsed = ts.parseJsonConfigFileContent(config, ts.sys, root);
    expect(parsed.errors).toEqual([]);
    const diagnostics = ts.getPreEmitDiagnostics(
      ts.createProgram(parsed.fileNames, parsed.options),
    );
    expect(
      diagnostics.map((item) => ts.flattenDiagnosticMessageText(item.messageText, '\n')),
    ).toEqual([]);
    const result = check(root);
    expect(result.status, result.output).toBe(name.startsWith('@deepseek-ai/') ? 1 : 0);
    if (name.startsWith('@deepseek-ai/'))
      expect(result.output).toContain('DSH_BOUNDARY src/other.ts');
  },
);

it.each([
  ['framework with format-only metadata', '@deepseek-ai/cordis', undefined, false, 1],
  ['ordinary package with format-only metadata', '@example/library', undefined, false, 0],
  [
    'named ordinary child of a framework package',
    '@deepseek-ai/cordis',
    '@example/child',
    false,
    0,
  ],
  [
    'named framework child of an ordinary package',
    '@example/library',
    '@deepseek-ai/cordis',
    false,
    1,
  ],
  [
    'anonymous dependency nested inside a framework package',
    '@deepseek-ai/cordis',
    undefined,
    true,
    0,
  ],
] as const)(
  'resolves package ownership for %s',
  async (_label, outerName, childName, nestedDependency, expectedStatus) => {
    const base = nestedDependency
      ? 'node_modules/vendor/node_modules/anonymous'
      : 'node_modules/vendor';
    const root = await fixture({
      'package.json': JSON.stringify({ name: '@example/application', type: 'module' }),
      'node_modules/vendor/package.json': JSON.stringify({
        name: outerName,
        version: '1.0.0',
        type: 'module',
      }),
      [`${base}/dist/package.json`]: JSON.stringify({
        type: 'module',
        ...(childName ? { name: childName, version: '1.0.0' } : {}),
      }),
      [`${base}/dist/index.d.ts`]: 'export interface Context { id: string }',
      'src/other.ts': "export type { Context } from 'runtime-alias';",
    });
    const configPath = join(root, 'tsconfig.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.compilerOptions.types = [];
    config.compilerOptions.paths = { 'runtime-alias': [`./${base}/dist/index.d.ts`] };
    await writeFile(configPath, JSON.stringify(config));
    const parsed = ts.parseJsonConfigFileContent(config, ts.sys, root);
    expect(parsed.errors).toEqual([]);
    const diagnostics = ts.getPreEmitDiagnostics(
      ts.createProgram(parsed.fileNames, parsed.options),
    );
    expect(
      diagnostics.map((item) => ts.flattenDiagnosticMessageText(item.messageText, '\n')),
    ).toEqual([]);
    const result = check(root);
    expect(result.status, result.output).toBe(expectedStatus);
    if (expectedStatus === 1) expect(result.output).toContain('DSH_BOUNDARY src/other.ts');
  },
);

it('accepts same-module development imports and rejects harness/service/type-export crossings', async () => {
  const root = await fixture({
    'scripts/harness/value.ts': 'export const value = 1;',
    'scripts/harness/use.ts': "export { value } from './value.ts';",
    'scripts/service/value.ts': 'export interface Config { port: number }',
  });
  expect(check(root).status).toBe(0);
  await writeFile(
    join(root, 'scripts/harness/use.ts'),
    "export type { Config } from '../service/value.ts';",
  );
  expect(check(root).output).toContain('DEVELOPMENT_DEPENDENCY');
  await writeFile(join(root, 'scripts/harness/use.ts'), "export { value } from './value.ts';");
  await writeFile(join(root, 'scripts/service/use.ts'), "import '../harness/value.ts';");
  expect(check(root).output).toContain('DEVELOPMENT_DEPENDENCY');
});

it('checks aliases and dynamic targets across development boundaries, and includes development cycles', async () => {
  const root = await fixture({
    'scripts/harness/a.ts': "import '@service/value';",
    'scripts/service/value.ts': 'export const value = 1;',
  });
  const path = join(root, 'tsconfig.json');
  const config = JSON.parse(await (await import('node:fs/promises')).readFile(path, 'utf8'));
  config.compilerOptions.paths = { '@service/*': ['./scripts/service/*'] };
  await writeFile(path, JSON.stringify(config));
  expect(check(root).output).toContain('DEVELOPMENT_DEPENDENCY');
  await writeFile(
    join(root, 'scripts/harness/a.ts'),
    'const target = "../service/value.ts"; void import(target);',
  );
  expect(check(root).output).toContain('DYNAMIC_IMPORT');
  await writeFile(join(root, 'scripts/harness/a.ts'), "import './b.ts';");
  await writeFile(join(root, 'scripts/harness/b.ts'), "export * from './a.ts';");
  expect(check(root).output).toContain('IMPORT_CYCLE');
});

it('refuses an undeclared script location and a development root with no dependency rules', async () => {
  const root = await fixture({ 'scripts/loose.ts': 'export const value = 1;' });
  expect(check(root).output).toContain('FILE_UNCLASSIFIED');
  await rm(join(root, 'scripts/loose.ts'));
  const path = join(root, 'harness.config.json');
  const config = JSON.parse(await (await import('node:fs/promises')).readFile(path, 'utf8'));
  delete config.developmentDependencies;
  await writeFile(path, JSON.stringify(config));
  expect(check(root).output).toContain('DEVELOPMENT_RULE_MISSING');
});

it('resolves conditional package aliases in the actual import or require mode', async () => {
  const root = await fixture({
    'package.json': JSON.stringify({
      type: 'module',
      imports: {
        '#tool': {
          import: './scripts/service/value.ts',
          require: './scripts/harness/value.ts',
        },
      },
    }),
    'scripts/harness/value.ts': 'export const value = 1;',
    'scripts/service/value.ts': 'export const value = 2;',
    'scripts/harness/use.ts': "import { value } from '#tool'; export { value };",
  });
  expect(check(root).output).toContain('DEVELOPMENT_DEPENDENCY');
  await writeFile(
    join(root, 'scripts/harness/use.ts'),
    "export type Value = typeof import('#tool');",
  );
  expect(check(root).output).toContain('DEVELOPMENT_DEPENDENCY');
  await writeFile(join(root, 'scripts/harness/use.ts'), "void import('#tool');");
  expect(check(root).output).toContain('DEVELOPMENT_DEPENDENCY');
  await writeFile(join(root, 'scripts/harness/use.ts'), "export const value = require('#tool');");
  expect(check(root).status).toBe(0);
  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({
      type: 'module',
      imports: {
        '#tool': {
          import: './scripts/harness/value.ts',
          require: './scripts/service/value.ts',
        },
      },
    }),
  );
  expect(check(root).output).toContain('DEVELOPMENT_DEPENDENCY');
  await writeFile(
    join(root, 'scripts/harness/use.ts'),
    "import { value } from '#tool'; export { value }; ",
  );
  expect(check(root).status).toBe(0);
});

it('rejects forcibly tracked private files without reading their contents', async () => {
  const root = await fixture({ '.work/record.txt': 'private fixture content' });
  expect(spawnSync('git', ['init', '-q'], { cwd: root }).status).toBe(0);
  expect(spawnSync('git', ['add', '-f', '.work/record.txt'], { cwd: root }).status).toBe(0);
  const result = check(root);
  expect(result.status).toBe(1);
  expect(result.output).toContain('INDEX_PRIVATE .work/record.txt');
  expect(result.output).not.toContain('private fixture content');
});

it('refuses a classified production root omitted from typecheck and build configuration', async () => {
  const root = await fixture({ 'worker/run.ts': "export const count: number = 'wrong';\n" });
  const configuration = JSON.parse(
    await (await import('node:fs/promises')).readFile(join(root, 'harness.config.json'), 'utf8'),
  ) as { sourceRoots: Record<string, string> };
  configuration.sourceRoots.worker = 'production';
  await writeFile(join(root, 'harness.config.json'), JSON.stringify(configuration));
  const result = check(root);
  expect(result.status, result.output).toBe(1);
  expect(result.output).toContain('SOURCE_NOT_TYPECHECKED worker/run.ts');
  expect(result.output).toContain('SOURCE_NOT_BUILT worker/run.ts');
});

it('allows only the explicit service migration config edge and isolates auth packages', async () => {
  const root = await fixture({
    'src/auth/config.ts': 'export const value = 1;',
    'src/auth/service.ts': 'export const service = 1;',
    'scripts/service/migrate.ts':
      "import { value } from '../../src/auth/config.ts'; export { value };",
  });
  expect(check(root).status).toBe(0);
  await writeFile(
    join(root, 'scripts/service/migrate.ts'),
    "export { service } from '../../src/auth/service.ts';",
  );
  expect(check(root).output).toContain('DEVELOPMENT_DEPENDENCY');
  await writeFile(join(root, 'scripts/service/migrate.ts'), 'export {};');
  await writeFile(join(root, 'src/bypass.ts'), "import { Pool } from 'pg'; export { Pool };");
  expect(check(root).output).toContain('AUTH_ADAPTER');
  await rm(join(root, 'src/bypass.ts'));
  await writeFile(join(root, 'src/auth/service.ts'), "import { Pool } from 'pg'; export { Pool };");
  expect(check(root).status).toBe(0);
  await writeFile(join(root, 'src/bypass.ts'), "export { authOptions } from 'better-auth';");
  expect(check(root).output).toContain('AUTH_ADAPTER');
});

it('keeps response primitives independent through resolved type imports, aliases and re-exports', async () => {
  const root = await fixture({
    'src/contracts.ts': 'export interface ApiError { error: { code: string } }',
    'src/auth/value.ts': 'export interface AuthValue { id: string }',
    'src/plugin.ts': 'export const plugin = 1;',
    'scripts/harness/tool.ts': 'export const tool = 1;',
    'src/http-response.ts': `import { randomUUID } from 'node:crypto';
import type { ServerResponse } from 'node:http';
import type { ApiError } from './contracts.ts';
export function start(response: ServerResponse): ApiError { return { error: { code: randomUUID() + response.statusCode } }; }`,
  });
  expect(check(root).status).toBe(0);
  const configPath = join(root, 'tsconfig.json');
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  config.compilerOptions.paths = {
    '@contract': ['./src/contracts.ts'],
    '@auth-value': ['./src/auth/value.ts'],
  };
  await writeFile(configPath, JSON.stringify(config));
  const helper = join(root, 'src/http-response.ts');
  await writeFile(helper, "export type { ApiError } from '@contract';");
  expect(check(root).status).toBe(0);
  for (const source of [
    "import type { AuthValue } from './auth/value.ts'; export type Value = AuthValue;",
    "export type { AuthValue } from './auth/value.ts';",
    "import type { AuthValue } from '@auth-value'; export type Value = AuthValue;",
    "export type Value = import('@auth-value').AuthValue;",
    "export { plugin } from './plugin.ts';",
    "export { Pool } from 'pg';",
    "import '../scripts/harness/tool.ts';",
    "export { URL } from 'node:url';",
  ]) {
    await writeFile(helper, source);
    const result = check(root);
    expect(result.status, source + result.output).toBe(1);
    expect(result.output, source).toContain('HTTP_RESPONSE_DEPENDENCY src/http-response.ts');
  }
});

it.each(['src/plugin.ts', 'src/auth/query.ts'])(
  'resolves database and authentication type aliases before checking the boundary in %s',
  async (file) => {
    const root = await fixture({
      'package.json': JSON.stringify({ type: 'module' }),
      [file]:
        "export type { Pool } from 'database-alias'; export type { BetterAuthOptions } from 'authentication-alias';",
    });
    await symlink(join(project, 'node_modules'), join(root, 'node_modules'), 'dir');
    const configPath = join(root, 'tsconfig.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.compilerOptions.paths = {
      'database-alias': [join(project, 'node_modules/@types/pg/index.d.ts')],
      'authentication-alias': [join(project, 'node_modules/better-auth/dist/index.d.mts')],
    };
    await writeFile(configPath, JSON.stringify(config));
    const parsed = ts.parseJsonConfigFileContent(config, ts.sys, root);
    expect(parsed.errors).toEqual([]);
    const diagnostics = ts.getPreEmitDiagnostics(
      ts.createProgram(parsed.fileNames, parsed.options),
    );
    expect(
      diagnostics.map((item) => ts.flattenDiagnosticMessageText(item.messageText, '\n')),
    ).toEqual([]);
    const result = check(root);
    expect(result.status, result.output).toBe(file.startsWith('src/auth/') ? 0 : 1);
    if (file === 'src/plugin.ts') expect(result.output.match(/AUTH_ADAPTER/g)).toHaveLength(2);
  },
);
