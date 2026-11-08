import { dirname } from 'node:path';
import { digest, identifier, json, resultBookPath } from './records.ts';
import { hashField, record, textField } from './legacy-reports.ts';

export const recordsPath = (prd: string) => `${dirname(resultBookPath(prd))}/records.json`;
export const resultSelector = (prd: string, key: string) =>
  `${recordsPath(prd)}#result=${identifier(key)}`;
export const evidenceSelector = (prd: string, key: string, criterion: string) =>
  `${resultSelector(prd, key)}&criterion=${identifier(criterion)}`;
export const hasResultSelector = (value: string) =>
  value.includes('/records.json#') || value.includes('#result');

/** Selectors are logical manifests; only their strictly decoded physical path is accessed. */
export function parseSelector(value: string) {
  const match =
    /^(docs\/tasks\/complete\/prd-[a-f0-9]{16}\/records\.json)#result=([a-z0-9][a-z0-9_-]{0,79})(?:&criterion=([a-z0-9][a-z0-9_-]{0,79}))?$/.exec(
      value,
    );
  if (!match) throw new Error(`WORK_REPORT_SELECTOR: ${value}`);
  return { path: match[1]!, key: match[2]!, criterion: match[3] };
}
export const recordsFile = (path: string) =>
  /^docs\/tasks\/complete\/prd-[a-f0-9]{16}\/records\.json$/.test(path);

interface StoredResult {
  key: string;
  evidence: { criterion: string; path: string; sha256: string }[];
}
export interface CompactRecords<T extends StoredResult> {
  version: 4;
  prd: string;
  results: { result: T; artifacts: Record<string, string> }[];
}

function fields(value: object, names: string[]) {
  if (Object.keys(value).some((key) => !names.includes(key)))
    throw new Error('WORK_REPORT_FORMAT: unsupported compact field');
}

/** The records file owns each result and every individual public acceptance artifact. */
export function parseRecords<T extends StoredResult>(
  source: string,
  parseResult: (value: unknown, prd: string) => T,
): CompactRecords<T> {
  const value = record(JSON.parse(source));
  fields(value, ['version', 'prd', 'results']);
  if (value.version !== 4 || !Array.isArray(value.results))
    throw new Error('WORK_REPORT_FORMAT: compact version/results');
  const prd = textField(value.prd);
  const keys = new Set<string>();
  const results = value.results.map((entry) => {
    const stored = record(entry);
    fields(stored, ['result', 'artifacts']);
    const result = parseResult(stored.result, prd);
    if (keys.has(result.key)) throw new Error('WORK_REPORT_FORMAT: duplicate result key');
    keys.add(result.key);
    const rawArtifacts = record(stored.artifacts);
    if (Object.keys(rawArtifacts).length !== result.evidence.length)
      throw new Error('WORK_REPORT_FORMAT: one compact artifact per criterion');
    const artifacts: Record<string, string> = {};
    for (const evidence of result.evidence) {
      const bytes = rawArtifacts[evidence.criterion];
      if (
        typeof bytes !== 'string' ||
        evidence.path !== evidenceSelector(prd, result.key, evidence.criterion) ||
        digest(bytes) !== evidence.sha256
      )
        throw new Error(`WORK_REPORT_EVIDENCE: ${evidence.path}`);
      artifacts[evidence.criterion] = bytes;
    }
    return { result, artifacts };
  });
  return { version: 4, prd, results };
}

export function parseCompactReference(source: unknown) {
  const value = record(source);
  fields(value, ['version', 'prd', 'records']);
  if (value.version !== 4) throw new Error('WORK_REPORT_FORMAT: compact reference version');
  const prd = textField(value.prd);
  const ref = record(value.records);
  fields(ref, ['path', 'sha256']);
  if (ref.path !== recordsPath(prd)) throw new Error('WORK_REPORT_FORMAT: records location');
  hashField(ref.sha256);
  return { prd, records: ref as { path: string; sha256: string } };
}

export function compactInput<T extends StoredResult>(
  records: CompactRecords<T>,
  selector: ReturnType<typeof parseSelector>,
) {
  if (selector.path !== recordsPath(records.prd))
    throw new Error('WORK_REPORT_BINDING: selector/PRD mismatch');
  const entry = records.results.find((entry) => entry.result.key === selector.key);
  if (!entry) throw new Error(`WORK_INPUT_MISSING: ${selector.path}#result=${selector.key}`);
  if (selector.criterion !== undefined) {
    const content = entry.artifacts[selector.criterion];
    if (content === undefined) throw new Error('WORK_REPORT_EVIDENCE: unknown criterion');
    return content;
  }
  return json(entry);
}
