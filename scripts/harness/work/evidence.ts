import { lstat, readFile } from 'node:fs/promises';
import { beneath } from '../inventory.ts';
import { documentCatalog, resolveDocument } from '../task-documents.ts';
import { checkedPath, digest, json } from './records.ts';
import type { Evidence } from './records.ts';

export async function artifact(root: string, id: string, path: string): Promise<Buffer> {
  // Raw evidence is isolated by task. Shared Markdown must first be retrieved by the operator.
  if (
    !beneath(path, `.work/tasks/${id}/evidence`) &&
    !(path.startsWith('docs/') && path.endsWith('.md'))
  )
    throw new Error("WORK_ARTIFACT: use this task's evidence directory or a shared document");
  if (path.startsWith('docs/tasks/')) resolveDocument(path, await documentCatalog(root));
  const absolute = await checkedPath(root, path);
  const stat = await lstat(absolute);
  if (!stat.isFile() || stat.nlink !== 1)
    throw new Error('WORK_ARTIFACT: original must be a regular file with no hard-link aliases');
  return readFile(absolute);
}

/** Select the complete check and later probes together, for assessment and delivery binding. */
export async function automatedEvidence(
  root: string,
  id: string,
  entries: Evidence[],
  command?: string[],
) {
  if (!command) return { result: 'pending', evidence: [] };
  let newerIssue: string | undefined;
  const selected: Evidence[] = [];
  for (const entry of entries.toReversed()) {
    selected.push(entry);
    let bytes: Buffer;
    try {
      bytes = await artifact(root, id, entry.artifact);
    } catch {
      newerIssue ??= 'missing';
      continue;
    }
    if (digest(bytes) !== entry.sha256) {
      newerIssue ??= 'corrupt';
      continue;
    }
    try {
      // work run writes one pretty-printed JSON header before stdout/stderr.
      const source = bytes.toString('utf8');
      const header = JSON.parse(source.slice(0, source.indexOf('\n}\n') + 2));
      if (
        header.candidate !== entry.candidate ||
        !Array.isArray(header.argv) ||
        !header.argv.length ||
        header.argv.some((arg: unknown) => typeof arg !== 'string')
      )
        throw new Error('Invalid automated observation header');
      if (json(header.argv) === json(command))
        return {
          result: entry.result === 'pass' ? (newerIssue ?? 'pass') : entry.result,
          evidence: selected.toReversed(),
        };
      if (entry.result !== 'pass') newerIssue ??= entry.result;
    } catch {
      newerIssue ??= 'invalid';
    }
  }
  return { result: newerIssue ?? 'pending', evidence: selected.toReversed() };
}
