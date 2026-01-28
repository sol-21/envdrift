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
  type SyncedEntry,
  type ScrubOptions,
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
  console.log(pc.dim(`    ${pc.cyan('--strict')} to scrub ALL values`));
  console.log(pc.dim(`    ${pc.cyan('--dry-run')} to preview changes`));
};

/**
 * Print dry-run table showing what would be written
 */
const printDryRunTable = (entries: SyncedEntry[]): void => {
  console.log();
  console.log(pc.cyan('► ') + pc.bold('DRY RUN - Preview of changes:'));
  console.log();

  // Table header
  const keyWidth = Math.max(20, ...entries.map((e) => e.key.length)) + 2;
  const valueWidth = 35;
  const reasonWidth = 25;

  console.log(
    pc.dim('┌' + '─'.repeat(keyWidth) + '┬' + '─'.repeat(valueWidth) + '┬' + '─'.repeat(reasonWidth) + '┐')
  );
  console.log(
    pc.dim('│') +
      pc.bold(' KEY'.padEnd(keyWidth)) +
      pc.dim('│') +
      pc.bold(' SCRUBBED VALUE'.padEnd(valueWidth)) +
      pc.dim('│') +
      pc.bold(' REASON'.padEnd(reasonWidth)) +
      pc.dim('│')
  );
  console.log(
    pc.dim('├' + '─'.repeat(keyWidth) + '┼' + '─'.repeat(valueWidth) + '┼' + '─'.repeat(reasonWidth) + '┤')
  );

  // Table rows
  entries.forEach((entry) => {
    const keyCell = (' ' + entry.key).padEnd(keyWidth);
    const truncatedValue =
      entry.scrubbedValue.length > valueWidth - 3
        ? entry.scrubbedValue.substring(0, valueWidth - 5) + '...'
        : entry.scrubbedValue;
    const valueCell = (' ' + truncatedValue).padEnd(valueWidth);
    const reasonCell = (' ' + entry.reason).padEnd(reasonWidth);

    const keyColor = entry.wasScubbed ? pc.yellow : pc.green;
    const valueColor = entry.wasScubbed ? pc.red : pc.white;
    const statusIcon = entry.wasScubbed ? pc.red('⚠') : pc.green('✓');

    console.log(
      pc.dim('│') +
        keyColor(keyCell) +
        pc.dim('│') +
        valueColor(valueCell) +
        pc.dim('│') +
        statusIcon + reasonCell.substring(1) +
        pc.dim('│')
    );
  });

  console.log(
    pc.dim('└' + '─'.repeat(keyWidth) + '┴' + '─'.repeat(valueWidth) + '┴' + '─'.repeat(reasonWidth) + '┘')
  );

  // Summary
  const scrubbedCount = entries.filter((e) => e.wasScubbed).length;
  console.log();
  console.log(pc.dim('─'.repeat(40)));
  console.log(
    pc.yellow(`⚠ ${scrubbedCount}`) +
      pc.dim(` value(s) would be scrubbed, `) +
      pc.green(`${entries.length - scrubbedCount}`) +
      pc.dim(` kept as-is`)
  );
  console.log();
  console.log(pc.cyan('ℹ ') + pc.dim('Run without --dry-run to apply changes'));
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
interface SyncCommandOptions {
  dryRun?: boolean;
  strict?: boolean;
}

const syncCommand = async (options: SyncCommandOptions): Promise<void> => {
  console.log(banner);

  const { envPath, examplePath } = getFilePaths();
  const scrubOptions: ScrubOptions = {
    strictMode: options.strict,
  };

  // Check if .env exists
  if (!(await fs.pathExists(envPath))) {
    console.log(pc.red('✗ ') + pc.bold('No .env file found'));
    console.log(pc.dim(`  Expected: ${envPath}`));
    process.exit(1);
  }

  // Show mode indicators
  if (options.strict) {
    console.log(pc.yellow('⚠ ') + pc.bold(pc.yellow('STRICT MODE')) + pc.dim(' - All values will be scrubbed'));
  }
  if (options.dryRun) {
    console.log(pc.cyan('ℹ ') + pc.bold(pc.cyan('DRY RUN')) + pc.dim(' - No files will be modified'));
  }

  console.log(pc.cyan('► ') + pc.bold('Syncing .env.example...'));
  console.log();

  const envContent = await readFileSafe(envPath);
  const exampleContent = await readFileSafe(examplePath);

  const envEntries = parseEnvContent(envContent);
  const exampleEntries = parseEnvContent(exampleContent);

  // Generate synced content with smart scrubbing
  const { content: syncedContent, entries: syncedEntries } = generateSyncedExample(
    envEntries,
    exampleEntries,
    scrubOptions
  );

  // Dry run mode - just show what would happen
  if (options.dryRun) {
    printDryRunTable(syncedEntries);
    return;
  }

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

  // Show scrubbing stats
  const scrubbedCount = syncedEntries.filter((e) => e.wasScubbed).length;
  console.log();
  console.log(pc.dim('─'.repeat(40)));
  console.log(pc.green('✓ ') + pc.dim(`${scrubbedCount} sensitive value(s) scrubbed`));
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
  .option('-d, --dry-run', 'Preview changes without modifying files')
  .option('-s, --strict', 'Scrub ALL values regardless of key name')
  .action(syncCommand);

// Default to help if no command provided
if (process.argv.length < 3) {
  console.log(banner);
  program.help();
}

program.parse();
