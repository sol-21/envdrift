/**
 * EnvDrift Diff Module
 * Compute and display diff between .env files
 */

import type { EnvEntry } from './engine.js';

export interface DiffLine {
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  key: string;
  envValue?: string;
  exampleValue?: string;
}

export interface DiffResult {
  lines: DiffLine[];
  added: number;
  removed: number;
  modified: number;
  unchanged: number;
}

/**
 * Compute diff between two sets of env entries
 */
export const computeDiff = (
  envEntries: EnvEntry[],
  exampleEntries: EnvEntry[]
): DiffResult => {
  const lines: DiffLine[] = [];
  const envMap = new Map(envEntries.map(e => [e.key, e.value]));
  const exampleMap = new Map(exampleEntries.map(e => [e.key, e.value]));

  // Get all unique keys
  const allKeys = new Set([...envMap.keys(), ...exampleMap.keys()]);
  const sortedKeys = Array.from(allKeys).sort();

  for (const key of sortedKeys) {
    const envValue = envMap.get(key);
    const exampleValue = exampleMap.get(key);

    if (envValue !== undefined && exampleValue === undefined) {
      // Key exists in .env but not in .env.example
      lines.push({
        type: 'added',
        key,
        envValue,
      });
    } else if (envValue === undefined && exampleValue !== undefined) {
      // Key exists in .env.example but not in .env
      lines.push({
        type: 'removed',
        key,
        exampleValue,
      });
    } else if (envValue !== exampleValue) {
      // Key exists in both but with different values
      lines.push({
        type: 'modified',
        key,
        envValue,
        exampleValue,
      });
    } else {
      // Key exists in both with same value
      lines.push({
        type: 'unchanged',
        key,
        envValue,
        exampleValue,
      });
    }
  }

  return {
    lines,
    added: lines.filter(l => l.type === 'added').length,
    removed: lines.filter(l => l.type === 'removed').length,
    modified: lines.filter(l => l.type === 'modified').length,
    unchanged: lines.filter(l => l.type === 'unchanged').length,
  };
};

/**
 * Compute diff showing only changes (hide unchanged)
 */
export const computeChangesOnly = (
  envEntries: EnvEntry[],
  exampleEntries: EnvEntry[]
): DiffResult => {
  const fullDiff = computeDiff(envEntries, exampleEntries);
  return {
    ...fullDiff,
    lines: fullDiff.lines.filter(l => l.type !== 'unchanged'),
  };
};
