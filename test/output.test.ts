import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createOutputHandler, type OutputOptions } from '../src/output.js';

describe('output module', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('createOutputHandler', () => {
    it('should suppress banner in json mode', () => {
      const options: OutputOptions = { format: 'json', quiet: false, ci: false };
      const out = createOutputHandler(options);
      
      out.banner();
      
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should suppress banner in quiet mode', () => {
      const options: OutputOptions = { format: 'text', quiet: true, ci: false };
      const out = createOutputHandler(options);
      
      out.banner();
      
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should suppress banner in CI mode', () => {
      const options: OutputOptions = { format: 'text', quiet: false, ci: true };
      const out = createOutputHandler(options);
      
      out.banner();
      
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should show banner in normal text mode', () => {
      const options: OutputOptions = { format: 'text', quiet: false, ci: false };
      const out = createOutputHandler(options);
      
      out.banner();
      
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should suppress log in quiet mode', () => {
      const options: OutputOptions = { format: 'text', quiet: true, ci: false };
      const out = createOutputHandler(options);
      
      out.log('test message');
      
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should suppress log in json mode', () => {
      const options: OutputOptions = { format: 'json', quiet: false, ci: false };
      const out = createOutputHandler(options);
      
      out.log('test message');
      
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should output JSON with json method', () => {
      const options: OutputOptions = { format: 'json', quiet: false, ci: false };
      const out = createOutputHandler(options);
      
      out.json({ test: 'data' });
      
      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify({ test: 'data' }, null, 2));
    });

    it('should not output JSON in text mode', () => {
      const options: OutputOptions = { format: 'text', quiet: false, ci: false };
      const out = createOutputHandler(options);
      
      out.json({ test: 'data' });
      
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should show success message in quiet mode', () => {
      const options: OutputOptions = { format: 'text', quiet: true, ci: false };
      const out = createOutputHandler(options);
      
      out.success('done');
      
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should not show success message in json mode', () => {
      const options: OutputOptions = { format: 'json', quiet: false, ci: false };
      const out = createOutputHandler(options);
      
      out.success('done');
      
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('printDriftResult', () => {
    it('should output JSON for drift result in json mode', () => {
      const options: OutputOptions = { format: 'json', quiet: false, ci: false };
      const out = createOutputHandler(options);
      
      out.printDriftResult(
        {
          isSynced: false,
          missingInExample: ['KEY1'],
          missingInLocal: ['KEY2'],
          envKeys: ['KEY1'],
          exampleKeys: ['KEY2'],
        },
        { input: '.env', output: '.env.example' }
      );
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"synced": false'));
    });

    it('should show minimal output in CI mode', () => {
      const options: OutputOptions = { format: 'text', quiet: false, ci: true };
      const out = createOutputHandler(options);
      
      out.printDriftResult(
        {
          isSynced: true,
          missingInExample: [],
          missingInLocal: [],
          envKeys: ['KEY1'],
          exampleKeys: ['KEY1'],
        },
        { input: '.env', output: '.env.example' }
      );
      
      expect(consoleSpy).toHaveBeenCalledWith('✓ No drift detected');
    });
  });

  describe('printDiff', () => {
    it('should output JSON for diff in json mode', () => {
      const options: OutputOptions = { format: 'json', quiet: false, ci: false };
      const out = createOutputHandler(options);
      
      out.printDiff(
        [{ type: 'added', key: 'KEY1', envValue: 'value' }],
        '.env',
        '.env.example'
      );
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"diff"'));
    });

    it('should show summary in CI mode', () => {
      const options: OutputOptions = { format: 'text', quiet: false, ci: true };
      const out = createOutputHandler(options);
      
      out.printDiff(
        [
          { type: 'added', key: 'KEY1', envValue: 'v1' },
          { type: 'removed', key: 'KEY2', exampleValue: 'v2' },
        ],
        '.env',
        '.env.example'
      );
      
      expect(consoleSpy).toHaveBeenCalledWith('1 added, 1 removed, 0 modified');
    });
  });
});
