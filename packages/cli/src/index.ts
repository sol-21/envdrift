#!/usr/bin/env node

/**
 * EnvDrift CLI
 * Sync .env files without leaking secrets
 */

import { Command } from 'commander';
import pc from 'picocolors';
import fs from 'fs-extra';
import path from 'path';
import {
  parseEnvContent,
  extractKeys,
  detectDrift,
  generateSyncedExample,
  type DriftResult,
} from './engine.js';

const VERSION = '1.0.0';

// ASCII art banner
const banner = `
${pc.green('╔═══════════════════════════════════════╗')}
${pc.green('║')}  ${pc.bold(pc.green('🛡️  EnvDrift'))}  ${pc.dim('v' + VERSION)}               ${pc.green('║')}
${pc.green('║')}  ${pc.dim('Sync .env files without leaking')}     ${pc.green('║')}
${pc.green('║')}  ${pc.dim('secrets.')}                            ${pc.green('║')}
${pc.green('╚═══════════════════════════════════════╝')}
`;

/**
 * Get file paths based on current working directory
 */
const getFilePaths = () => {
  const cwd = process.cwd();
  return {
    envPath: path.join(cwd, '.env'),
    examplePath: path.join(cwd, '.env.example'),
  };
};

/**
 * Read file safely, return empty string if not found
 */
const readFileSafe = async (filePath: string): Promise<string> => {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return '';
  }
};

/**
 * Print drift results with hacker aesthetic
 */
const printDriftResult = (result: DriftResult, envPath: string, examplePath: string): void => {
  console.log();

  if (result.isSynced) {
    console.log(pc.green('✓ ') + pc.bold(pc.green('SYNCED')) + pc.dim(' - No drift detected'));
    console.log(pc.dim(`  .env has ${result.envKeys.length} keys`));
    console.log(pc.dim(`  .env.example has ${result.exampleKeys.length} keys`));
    return;
  }

  console.log(pc.red('✗ ') + pc.bold(pc.red('DRIFT DETECTED')));
  console.log();

  if (result.missingInExample.length > 0) {
    console.log(
      pc.yellow('⚠ ') +
        pc.bold(`Missing in .env.example (${result.missingInExample.length}):`)
    );
    result.missingInExample.forEach((key) => {
      console.log(pc.red('  - ') + pc.white(key));
    });
    console.log();
  }

  if (result.missingInLocal.length > 0) {
    console.log(
      pc.yellow('⚠ ') +
        pc.bold(`Missing in .env (${result.missingInLocal.length}):`)
    );
    result.missingInLocal.forEach((key) => {
      console.log(pc.red('  - ') + pc.white(key));
    });
    console.log();
  }

  console.log(pc.dim('─'.repeat(40)));
  console.log(pc.dim(`Run ${pc.green('envdrift sync')} to fix drift`));
};

/**
 * CHECK command - Detect drift between .env and .env.example
 */
const checkCommand = async (): Promise<void> => {
  console.log(banner);

  const { envPath, examplePath } = getFilePaths();

  // Check if .env exists
  if (!(await fs.pathExists(envPath))) {
    console.log(pc.red('✗ ') + pc.bold('No .env file found'));
    console.log(pc.dim(`  Expected: ${envPath}`));
    process.exit(1);
  }

  const envContent = await readFileSafe(envPath);
  const exampleContent = await readFileSafe(examplePath);

  const envEntries = parseEnvContent(envContent);
  const exampleEntries = parseEnvContent(exampleContent);

  const envKeys = extractKeys(envEntries);
  const exampleKeys = extractKeys(exampleEntries);

  const result = detectDrift(envKeys, exampleKeys);

  printDriftResult(result, envPath, examplePath);

  // Exit with code 1 if drift detected (useful for CI)
  if (!result.isSynced) {
    process.exit(1);
  }
};

/**
 * SYNC command - Update .env.example with smart scrubbing
 */
const syncCommand = async (): Promise<void> => {
  console.log(banner);

  const { envPath, examplePath } = getFilePaths();

  // Check if .env exists
  if (!(await fs.pathExists(envPath))) {
    console.log(pc.red('✗ ') + pc.bold('No .env file found'));
    console.log(pc.dim(`  Expected: ${envPath}`));
    process.exit(1);
  }

  console.log(pc.cyan('► ') + pc.bold('Syncing .env.example...'));
  console.log();

  const envContent = await readFileSafe(envPath);
  const exampleContent = await readFileSafe(examplePath);

  const envEntries = parseEnvContent(envContent);
  const exampleEntries = parseEnvContent(exampleContent);

  // Generate synced content with smart scrubbing
  const syncedContent = generateSyncedExample(envEntries, exampleEntries);

  // Write to .env.example
  await fs.writeFile(examplePath, syncedContent, 'utf-8');

  // Calculate what changed
  const envKeys = extractKeys(envEntries);
  const exampleKeys = extractKeys(exampleEntries);
  const newKeys = envKeys.filter((key) => !exampleKeys.includes(key));

  console.log(pc.green('✓ ') + pc.bold(pc.green('.env.example updated!')));
  console.log();

  if (newKeys.length > 0) {
    console.log(pc.green(`  Added ${newKeys.length} new key(s):`));
    newKeys.forEach((key) => {
      console.log(pc.green('    + ') + pc.white(key));
    });
  } else {
    console.log(pc.dim('  No new keys added'));
  }

  console.log();
  console.log(pc.dim('─'.repeat(40)));
  console.log(pc.green('✓ ') + pc.dim('All sensitive values have been scrubbed'));
  console.log(pc.dim(`  Output: ${examplePath}`));
};

// Initialize CLI
const program = new Command();

program
  .name('envdrift')
  .description('Sync .env files without leaking secrets')
  .version(VERSION);

program
  .command('check')
  .description('Detect drift between .env and .env.example')
  .action(checkCommand);

program
  .command('sync')
  .description('Sync and scrub .env.example with values from .env')
  .action(syncCommand);

// Default to help if no command provided
if (process.argv.length < 3) {
  console.log(banner);
  program.help();
}

program.parse();
