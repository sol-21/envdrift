import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import {
  loadConfig,
  mergeConfigWithOptions,
  generateDefaultConfig,
  findConfigFile,
  DEFAULT_CONFIG,
} from '../src/config.js';

describe('config', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'envdrift-test-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('findConfigFile', () => {
    it('should return null when no config file exists', async () => {
      const result = await findConfigFile(tempDir);
      expect(result).toBeNull();
    });

    it('should find .envdriftrc.json', async () => {
      const configPath = path.join(tempDir, '.envdriftrc.json');
      await fs.writeFile(configPath, '{}');
      
      const result = await findConfigFile(tempDir);
      expect(result).toBe(configPath);
    });

    it('should find .envdriftrc', async () => {
      const configPath = path.join(tempDir, '.envdriftrc');
      await fs.writeFile(configPath, '{}');
      
      const result = await findConfigFile(tempDir);
      expect(result).toBe(configPath);
    });

    it('should find envdrift.config.json', async () => {
      const configPath = path.join(tempDir, 'envdrift.config.json');
      await fs.writeFile(configPath, '{}');
      
      const result = await findConfigFile(tempDir);
      expect(result).toBe(configPath);
    });

    it('should prefer .envdriftrc.json over other names', async () => {
      await fs.writeFile(path.join(tempDir, '.envdriftrc.json'), '{}');
      await fs.writeFile(path.join(tempDir, '.envdriftrc'), '{}');
      
      const result = await findConfigFile(tempDir);
      expect(result).toBe(path.join(tempDir, '.envdriftrc.json'));
    });
  });

  describe('loadConfig', () => {
    it('should return default config when no file exists', async () => {
      const { config, configPath } = await loadConfig(tempDir);
      
      expect(configPath).toBeNull();
      expect(config.input).toBe('.env');
      expect(config.output).toBe('.env.example');
      expect(config.strict).toBe(false);
    });

    it('should load and merge config from file', async () => {
      const configFile = path.join(tempDir, '.envdriftrc.json');
      await fs.writeFile(configFile, JSON.stringify({
        input: '.env.local',
        strict: true,
        ignore: ['MY_KEY']
      }));
      
      const { config, configPath } = await loadConfig(tempDir);
      
      expect(configPath).toBe(configFile);
      expect(config.input).toBe('.env.local');
      expect(config.output).toBe('.env.example'); // default
      expect(config.strict).toBe(true);
      expect(config.ignore).toContain('MY_KEY');
    });
  });

  describe('mergeConfigWithOptions', () => {
    it('should override config with CLI options', () => {
      const config = { ...DEFAULT_CONFIG, input: '.env' };
      const result = mergeConfigWithOptions(config, { input: '.env.local' });
      
      expect(result.input).toBe('.env.local');
    });

    it('should not override when CLI option is undefined', () => {
      const config = { ...DEFAULT_CONFIG, strict: true };
      const result = mergeConfigWithOptions(config, {});
      
      expect(result.strict).toBe(true);
    });

    it('should merge ignore arrays', () => {
      const config = { ...DEFAULT_CONFIG, ignore: ['A', 'B'] };
      const result = mergeConfigWithOptions(config, { ignore: ['C'] });
      
      expect(result.ignore).toContain('A');
      expect(result.ignore).toContain('B');
      expect(result.ignore).toContain('C');
    });

    it('should deduplicate merged arrays', () => {
      const config = { ...DEFAULT_CONFIG, ignore: ['A', 'B'] };
      const result = mergeConfigWithOptions(config, { ignore: ['B', 'C'] });
      
      const bCount = result.ignore?.filter(k => k === 'B').length;
      expect(bCount).toBe(1);
    });
  });

  describe('generateDefaultConfig', () => {
    it('should generate valid JSON', () => {
      const configStr = generateDefaultConfig();
      expect(() => JSON.parse(configStr)).not.toThrow();
    });

    it('should include default ignore list', () => {
      const config = JSON.parse(generateDefaultConfig());
      expect(config.ignore).toContain('NODE_ENV');
      expect(config.ignore).toContain('DEBUG');
    });

    it('should have expected structure', () => {
      const config = JSON.parse(generateDefaultConfig());
      expect(config).toHaveProperty('input');
      expect(config).toHaveProperty('output');
      expect(config).toHaveProperty('strict');
      expect(config).toHaveProperty('ignore');
      expect(config).toHaveProperty('preserveComments');
    });
  });
});
