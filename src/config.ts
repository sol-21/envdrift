/**
 * EnvDrift Configuration Module
 * Handles loading and merging configuration from .envdriftrc.json
 */

import fs from 'fs-extra';
import path from 'path';

export interface EnvDriftConfig {
  // File paths
  input?: string;
  output?: string;

  // Behavior
  strict?: boolean;
  ci?: boolean;

  // Keys to ignore (never scrub)
  ignore?: string[];

  // Keys to always scrub (even if non-sensitive)
  alwaysScrub?: string[];

  // Custom sensitive keywords to add
  sensitiveKeywords?: string[];

  // Custom secret patterns (regex-based)
  customPatterns?: { name: string; pattern: string }[];

  // Preserve comments from source file
  preserveComments?: boolean;

  // Merge mode - add new keys without overwriting existing
  merge?: boolean;

  // Custom placeholder format (default: YOUR_{KEY}_HERE)
  placeholderFormat?: string;

  // Sort keys alphabetically
  sort?: boolean;

  // Group keys by prefix (e.g., AWS_, DB_)
  groupByPrefix?: boolean;
}

const CONFIG_FILE_NAMES = [
  '.envdriftrc.json',
  '.envdriftrc',
  'envdrift.config.json',
];

const DEFAULT_CONFIG: EnvDriftConfig = {
  input: '.env',
  output: '.env.example',
  strict: false,
  ci: false,
  ignore: [],
  alwaysScrub: [],
  sensitiveKeywords: [],
  preserveComments: true,
  merge: false,
  placeholderFormat: 'YOUR_{KEY}_HERE',
  sort: false,
  groupByPrefix: false,
};

/**
 * Find config file in the current directory or parent directories
 */
export const findConfigFile = async (startDir: string = process.cwd()): Promise<string | null> => {
  let currentDir = startDir;

  while (currentDir !== path.parse(currentDir).root) {
    for (const fileName of CONFIG_FILE_NAMES) {
      const configPath = path.join(currentDir, fileName);
      if (await fs.pathExists(configPath)) {
        return configPath;
      }
    }
    currentDir = path.dirname(currentDir);
  }

  return null;
};

/**
 * Load configuration from file
 */
export const loadConfigFile = async (configPath: string): Promise<EnvDriftConfig> => {
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse config file: ${configPath}`);
  }
};

/**
 * Load and merge configuration from file with defaults
 */
export const loadConfig = async (cwd: string = process.cwd()): Promise<{ config: EnvDriftConfig; configPath: string | null }> => {
  const configPath = await findConfigFile(cwd);

  if (!configPath) {
    return { config: { ...DEFAULT_CONFIG }, configPath: null };
  }

  const fileConfig = await loadConfigFile(configPath);

  return {
    config: {
      ...DEFAULT_CONFIG,
      ...fileConfig,
      // Merge arrays instead of replacing
      ignore: [...(DEFAULT_CONFIG.ignore || []), ...(fileConfig.ignore || [])],
      alwaysScrub: [...(DEFAULT_CONFIG.alwaysScrub || []), ...(fileConfig.alwaysScrub || [])],
      sensitiveKeywords: [...(DEFAULT_CONFIG.sensitiveKeywords || []), ...(fileConfig.sensitiveKeywords || [])],
    },
    configPath,
  };
};

/**
 * Merge CLI options with config file options (CLI takes precedence)
 */
export const mergeConfigWithOptions = (
  config: EnvDriftConfig,
  cliOptions: Partial<EnvDriftConfig>
): EnvDriftConfig => {
  const merged = { ...config };

  // CLI options override config file
  if (cliOptions.input !== undefined) merged.input = cliOptions.input;
  if (cliOptions.output !== undefined) merged.output = cliOptions.output;
  if (cliOptions.strict !== undefined) merged.strict = cliOptions.strict;
  if (cliOptions.ci !== undefined) merged.ci = cliOptions.ci;
  if (cliOptions.preserveComments !== undefined) merged.preserveComments = cliOptions.preserveComments;
  if (cliOptions.merge !== undefined) merged.merge = cliOptions.merge;
  if (cliOptions.sort !== undefined) merged.sort = cliOptions.sort;

  // Merge arrays (CLI additions)
  if (cliOptions.ignore) {
    merged.ignore = [...new Set([...(merged.ignore || []), ...cliOptions.ignore])];
  }
  if (cliOptions.alwaysScrub) {
    merged.alwaysScrub = [...new Set([...(merged.alwaysScrub || []), ...cliOptions.alwaysScrub])];
  }

  return merged;
};

/**
 * Generate default config file content
 */
export const generateDefaultConfig = (): string => {
  const config: EnvDriftConfig = {
    input: '.env',
    output: '.env.example',
    strict: false,
    ignore: ['NODE_ENV', 'DEBUG'],
    alwaysScrub: [],
    sensitiveKeywords: [],
    preserveComments: true,
    merge: false,
    sort: false,
  };

  return JSON.stringify(config, null, 2);
};

export { DEFAULT_CONFIG };
