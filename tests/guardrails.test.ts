import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
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
