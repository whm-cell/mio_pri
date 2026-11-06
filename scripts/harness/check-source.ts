import { readFile, realpath } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import ts from 'typescript';
import { beneath } from './inventory.ts';
import type { HarnessConfig } from './inventory.ts';

// Aliases can lack packageId; file symlinks can retain a different packageId.
async function owningPackageName(file: string): Promise<string | undefined> {
  let directory = dirname(await realpath(file));
  for (;;) {
    // Anonymous format metadata inherits ownership, but dependencies do not inherit their host's.
    if (basename(directory) === 'node_modules') return undefined;
    try {
      const manifest = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8')) as {
        name?: unknown;
      };
      if (typeof manifest.name === 'string' && manifest.name.length > 0) return manifest.name;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    const parent = dirname(directory);
    if (parent === directory) return undefined;
    directory = parent;
  }
}

/** TypeScript syntax and module resolution, including type-only exports and literal dynamic imports. */
export async function checkSource(root: string, files: readonly string[], harness: HarnessConfig) {
  const errors: string[] = [];
  const metrics: string[] = [];
  const graph = new Map<string, string[]>();
  const configPath = ts.findConfigFile(root, ts.sys.fileExists);
  if (!configPath) throw new Error('tsconfig.json missing');
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  const buildConfig = ts.readConfigFile(join(root, 'tsconfig.build.json'), ts.sys.readFile);
  if (config.error || buildConfig.error || parsed.errors.length) {
    throw new Error('Invalid or missing TypeScript configuration; run pnpm typecheck');
  }
  const build = ts.parseJsonConfigFileContent(buildConfig.config, ts.sys, root);
  if (build.errors.length) throw new Error('Invalid build configuration; run pnpm build');
  const typedFiles = new Set(parsed.fileNames.map((file) => resolve(file)));
  const builtFiles = new Set(build.fileNames.map((file) => resolve(file)));

  const roleOf = (path: string) =>
    Object.entries(harness.sourceRoots).find(([base]) => beneath(path, base))?.[1];
  for (const [base, role] of Object.entries(harness.sourceRoots)) {
    if (role === 'development' && !Array.isArray(harness.developmentDependencies?.[base]))
      errors.push(`DEVELOPMENT_RULE_MISSING ${base}: declare allowed development dependencies`);
  }
  for (const file of files.filter((path) => roleOf(path) !== undefined && path.endsWith('.ts'))) {
    const production = roleOf(file) === 'production';
    const developmentRoot = Object.keys(harness.sourceRoots).find(
      (base) => beneath(file, base) && harness.sourceRoots[base] === 'development',
    );
    if (!typedFiles.has(resolve(root, file))) {
      errors.push(`SOURCE_NOT_TYPECHECKED ${file}: include it in tsconfig.json`);
    }
    if (production && !builtFiles.has(resolve(root, file))) {
      errors.push(`SOURCE_NOT_BUILT ${file}: include it in tsconfig.build.json`);
    }
    const text = await readFile(join(root, file), 'utf8');
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    source.impliedNodeFormat = ts.getImpliedNodeFormatForFile(
      join(root, file),
      undefined,
      ts.sys,
      parsed.options,
    );
    const imports: { specifier: string; mode: ts.ResolutionMode }[] = [];
    let functions = 0;
    let longestFunction = 0;
    let deepestBlock = 0;
    let branches = 0;
    const visit = (node: ts.Node, depth = 0): void => {
      const nextDepth = depth + (ts.isBlock(node) ? 1 : 0);
      deepestBlock = Math.max(deepestBlock, nextDepth);
      if (ts.isFunctionLike(node) && 'body' in node && node.body) {
        functions++;
        const start = source.getLineAndCharacterOfPosition(node.getStart()).line;
        const end = source.getLineAndCharacterOfPosition(node.end).line;
        longestFunction = Math.max(longestFunction, end - start + 1);
      }
      if (
        ts.isIfStatement(node) ||
        ts.isConditionalExpression(node) ||
        ts.isCaseClause(node) ||
        ts.isCatchClause(node) ||
        ts.isForStatement(node) ||
        ts.isForOfStatement(node) ||
        ts.isForInStatement(node) ||
        ts.isWhileStatement(node) ||
        ts.isDoStatement(node)
      )
        branches++;
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      )
        imports.push({
          specifier: node.moduleSpecifier.text,
          mode: ts.getModeForUsageLocation(source, node.moduleSpecifier, parsed.options),
        });
      if (
        ts.isImportTypeNode(node) &&
        ts.isLiteralTypeNode(node.argument) &&
        ts.isStringLiteral(node.argument.literal)
      )
        imports.push({
          specifier: node.argument.literal.text,
          mode: ts.getModeForUsageLocation(source, node.argument.literal, parsed.options),
        });
      if (
        ts.isImportEqualsDeclaration(node) &&
        ts.isExternalModuleReference(node.moduleReference) &&
        node.moduleReference.expression &&
        ts.isStringLiteral(node.moduleReference.expression)
      ) {
        imports.push({
          specifier: node.moduleReference.expression.text,
          mode: ts.ModuleKind.CommonJS,
        });
      }
      if (
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
      ) {
        const arg = node.arguments[0];
        if (arg && ts.isStringLiteralLike(arg))
          imports.push({
            specifier: arg.text,
            mode:
              node.expression.kind === ts.SyntaxKind.ImportKeyword
                ? ts.getModeForUsageLocation(source, arg, parsed.options)
                : ts.ModuleKind.CommonJS,
          });
        else if (production || developmentRoot)
          errors.push(`DYNAMIC_IMPORT ${file}: checked module target must be explicit`);
      }
      ts.forEachChild(node, (child) => visit(child, nextDepth));
    };
    visit(source);
    const edges: string[] = [];
    for (const { specifier, mode } of imports) {
      const resolved = ts.resolveModuleName(
        specifier,
        join(root, file),
        parsed.options,
        ts.sys,
        undefined,
        undefined,
        mode,
      ).resolvedModule;
      const target = resolved && relative(root, resolved.resolvedFileName).replaceAll('\\', '/');
      if (
        (!specifier.startsWith('.') &&
          (specifier.includes('/src/') || specifier.includes('/lib/'))) ||
        isAbsolute(specifier)
      ) {
        errors.push(`PUBLIC_IMPORT ${file}: ${specifier}`);
      }
      if (developmentRoot) {
        if (target && !resolved?.isExternalLibraryImport) {
          const allowed = harness.developmentDependencies?.[developmentRoot] ?? [];
          if (!allowed.some((base) => beneath(target, base)))
            errors.push(
              `DEVELOPMENT_DEPENDENCY ${file}: ${target} is outside ${developmentRoot}'s allowed dependencies`,
            );
          else edges.push(target);
        }
        if (specifier.startsWith('.') && (!target || !resolve(root, target).startsWith(`${root}/`)))
          errors.push(`IMPORT_UNRESOLVED ${file}: ${specifier}`);
      }
      if (!production) continue;
      const packageName = resolved && (await owningPackageName(resolved.resolvedFileName));
      const authPackage = [specifier.split('/')[0], resolved?.packageId?.name, packageName].some(
        (name) =>
          name === 'better-auth' ||
          name === 'pg' ||
          name === '@types/pg' ||
          name?.startsWith('@better-auth/'),
      );
      if ((authPackage || specifier.startsWith('@better-auth/')) && !beneath(file, 'src/auth'))
        errors.push(
          `AUTH_ADAPTER ${file}: authentication and database packages belong in src/auth`,
        );
      if (file !== 'src/plugin.ts') {
        if (
          specifier.startsWith('@deepseek-ai/') ||
          resolved?.packageId?.name.startsWith('@deepseek-ai/') ||
          packageName?.startsWith('@deepseek-ai/')
        )
          errors.push(`DSH_BOUNDARY ${file}: framework access belongs in src/plugin.ts`);
      }
      if (/^(?:node:)?(?:child_process|fs|vm|worker_threads|module)(?:\/|$)/.test(specifier)) {
        errors.push(`RUNTIME_CAPABILITY ${file}: ${specifier} needs an explicit reviewed boundary`);
      }
      if (target && !resolved?.isExternalLibraryImport) {
        if (roleOf(target) !== 'production') errors.push(`RUNTIME_DEPENDENCY ${file}: ${target}`);
        else {
          edges.push(target);
          if (target === 'src/plugin.ts' && file !== target)
            errors.push(`ADAPTER_DIRECTION ${file}: ${target}`);
          if (file === 'src/contracts.ts')
            errors.push(`CONTRACT_DIRECTION ${file}: contracts must be runtime-independent`);
        }
      }
      if (specifier.startsWith('.') && (!target || !resolve(root, target).startsWith(`${root}/`))) {
        errors.push(`IMPORT_UNRESOLVED ${file}: ${specifier}`);
      }
    }
    graph.set(file, edges);
    metrics.push(
      `${file}: lines=${text.split('\n').length}, functions=${functions}, longestFunction=${longestFunction}, blockDepth=${deepestBlock}, decisionNodes=${branches}`,
    );
  }
  const seen = new Set<string>();
  const active = new Set<string>();
  const visit = (file: string): void => {
    if (active.has(file)) {
      errors.push(`IMPORT_CYCLE ${file}`);
      return;
    }
    if (seen.has(file)) return;
    active.add(file);
    for (const target of graph.get(file) ?? []) visit(target);
    active.delete(file);
    seen.add(file);
  };
  for (const file of graph.keys()) visit(file);
  return { errors, metrics };
}
