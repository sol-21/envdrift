import { describe, it, expect } from 'vitest';
import { computeDiff, computeChangesOnly } from '../src/diff.js';
import type { EnvEntry } from '../src/engine.js';

describe('diff module', () => {
  describe('computeDiff', () => {
    it('should detect added keys', () => {
      const envEntries: EnvEntry[] = [
        { key: 'A', value: '1', line: 1 },
        { key: 'B', value: '2', line: 2 },
      ];
      const exampleEntries: EnvEntry[] = [
        { key: 'A', value: '1', line: 1 },
      ];

      const result = computeDiff(envEntries, exampleEntries);
      
      expect(result.added).toBe(1);
      expect(result.lines.find(l => l.key === 'B')?.type).toBe('added');
    });

    it('should detect removed keys', () => {
      const envEntries: EnvEntry[] = [
        { key: 'A', value: '1', line: 1 },
      ];
      const exampleEntries: EnvEntry[] = [
        { key: 'A', value: '1', line: 1 },
        { key: 'B', value: '2', line: 2 },
      ];

      const result = computeDiff(envEntries, exampleEntries);
      
      expect(result.removed).toBe(1);
      expect(result.lines.find(l => l.key === 'B')?.type).toBe('removed');
    });

    it('should detect modified keys', () => {
      const envEntries: EnvEntry[] = [
        { key: 'A', value: 'new', line: 1 },
      ];
      const exampleEntries: EnvEntry[] = [
        { key: 'A', value: 'old', line: 1 },
      ];

      const result = computeDiff(envEntries, exampleEntries);
      
      expect(result.modified).toBe(1);
      expect(result.lines.find(l => l.key === 'A')?.type).toBe('modified');
    });

    it('should detect unchanged keys', () => {
      const envEntries: EnvEntry[] = [
        { key: 'A', value: 'same', line: 1 },
      ];
      const exampleEntries: EnvEntry[] = [
        { key: 'A', value: 'same', line: 1 },
      ];

      const result = computeDiff(envEntries, exampleEntries);
      
      expect(result.unchanged).toBe(1);
      expect(result.lines.find(l => l.key === 'A')?.type).toBe('unchanged');
    });

    it('should sort keys alphabetically', () => {
      const envEntries: EnvEntry[] = [
        { key: 'Z', value: '1', line: 1 },
        { key: 'A', value: '2', line: 2 },
        { key: 'M', value: '3', line: 3 },
      ];
      const exampleEntries: EnvEntry[] = [];

      const result = computeDiff(envEntries, exampleEntries);
      
      expect(result.lines.map(l => l.key)).toEqual(['A', 'M', 'Z']);
    });

    it('should handle empty .env file', () => {
      const envEntries: EnvEntry[] = [];
      const exampleEntries: EnvEntry[] = [
        { key: 'A', value: '1', line: 1 },
      ];

      const result = computeDiff(envEntries, exampleEntries);
      
      expect(result.removed).toBe(1);
      expect(result.added).toBe(0);
    });

    it('should handle empty .env.example file', () => {
      const envEntries: EnvEntry[] = [
        { key: 'A', value: '1', line: 1 },
      ];
      const exampleEntries: EnvEntry[] = [];

      const result = computeDiff(envEntries, exampleEntries);
      
      expect(result.added).toBe(1);
      expect(result.removed).toBe(0);
    });
  });

  describe('computeChangesOnly', () => {
    it('should filter out unchanged lines', () => {
      const envEntries: EnvEntry[] = [
        { key: 'A', value: 'same', line: 1 },
        { key: 'B', value: 'new', line: 2 },
      ];
      const exampleEntries: EnvEntry[] = [
        { key: 'A', value: 'same', line: 1 },
        { key: 'C', value: 'removed', line: 2 },
      ];

      const result = computeChangesOnly(envEntries, exampleEntries);
      
      expect(result.lines.length).toBe(2); // B added, C removed
      expect(result.lines.find(l => l.key === 'A')).toBeUndefined();
    });

    it('should keep summary counts accurate', () => {
      const envEntries: EnvEntry[] = [
        { key: 'A', value: 'same', line: 1 },
        { key: 'B', value: 'new', line: 2 },
      ];
      const exampleEntries: EnvEntry[] = [
        { key: 'A', value: 'same', line: 1 },
      ];

      const result = computeChangesOnly(envEntries, exampleEntries);
      
      expect(result.unchanged).toBe(1); // Summary still accurate
      expect(result.added).toBe(1);
    });
  });
});
