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
  configToSyncOptions,
  type DriftResult,
  type SyncedEntry,
  type SyncOptions,
} from './engine.js';
import {
  loadConfig,
  mergeConfigWithOptions,
  generateDefaultConfig,
  type EnvDriftConfig,
} from './config.js';

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
 * Get file paths based on config and current working directory
 */
const getFilePaths = (config: EnvDriftConfig) => {
  const cwd = process.cwd();
  return {
    envPath: path.resolve(cwd, config.input || '.env'),
    examplePath: path.resolve(cwd, config.output || '.env.example'),
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
const printDriftResult = (result: DriftResult, config: EnvDriftConfig): void => {
  console.log();

  if (result.isSynced) {
    console.log(pc.green('✓ ') + pc.bold(pc.green('SYNCED')) + pc.dim(' - No drift detected'));
    console.log(pc.dim(`  ${config.input} has ${result.envKeys.length} keys`));
    console.log(pc.dim(`  ${config.output} has ${result.exampleKeys.length} keys`));
    return;
  }

  console.log(pc.red('✗ ') + pc.bold(pc.red('DRIFT DETECTED')));
  console.log();

  if (result.missingInExample.length > 0) {
    console.log(
      pc.yellow('⚠ ') +
        pc.bold(`Missing in ${config.output} (${result.missingInExample.length}):`)
    );
    result.missingInExample.forEach((key) => {
      console.log(pc.red('  - ') + pc.white(key));
    });
    console.log();
  }

  if (result.missingInLocal.length > 0) {
    console.log(
      pc.yellow('⚠ ') +
        pc.bold(`Missing in ${config.input} (${result.missingInLocal.length}):`)
    );
    result.missingInLocal.forEach((key) => {
      console.log(pc.red('  - ') + pc.white(key));
    });
    console.log();
  }

  console.log(pc.dim('─'.repeat(40)));
  console.log(pc.dim(`Run ${pc.green('envdrift sync')} to fix drift`));
  if (!config.strict) {
    console.log(pc.dim(`    ${pc.cyan('--strict')} to scrub ALL values`));
  }
  console.log(pc.dim(`    ${pc.cyan('--dry-run')} to preview changes`));
};

/**
 * Print dry-run table showing what would be written
 */
const printDryRunTable = (entries: SyncedEntry[], added: string[], removed: string[]): void => {
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
    const isNew = added.includes(entry.key);
    const keyCell = (' ' + (isNew ? '+ ' : '') + entry.key).padEnd(keyWidth);
    const truncatedValue =
      entry.scrubbedValue.length > valueWidth - 3
        ? entry.scrubbedValue.substring(0, valueWidth - 5) + '...'
        : entry.scrubbedValue;
    const valueCell = (' ' + truncatedValue).padEnd(valueWidth);
    const reasonCell = (' ' + entry.reason).padEnd(reasonWidth);

    const keyColor = isNew ? pc.green : entry.wasScrubbed ? pc.yellow : pc.white;
    const valueColor = entry.wasScrubbed ? pc.red : pc.white;
    const statusIcon = entry.wasScrubbed ? pc.red('⚠') : pc.green('✓');

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
  const scrubbedCount = entries.filter((e) => e.wasScrubbed).length;
  console.log();
  
  if (added.length > 0) {
    console.log(pc.green(`+ ${added.length} new key(s) would be added`));
  }
  if (removed.length > 0) {
    console.log(pc.red(`- ${removed.length} key(s) would be removed`));
  }
  
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
 * Print config info
 */
const printConfigInfo = (configPath: string | null, config: EnvDriftConfig): void => {
  if (configPath) {
    console.log(pc.dim(`📄 Config: ${path.relative(process.cwd(), configPath)}`));
  }
  if (config.ignore?.length) {
    console.log(pc.dim(`🔓 Ignored keys: ${config.ignore.join(', ')}`));
  }
  if (config.alwaysScrub?.length) {
    console.log(pc.dim(`🔒 Always scrub: ${config.alwaysScrub.join(', ')}`));
  }
};

/**
 * CHECK command - Detect drift between .env and .env.example
 */
interface CheckCommandOptions {
  input?: string;
  output?: string;
  ci?: boolean;
}

const checkCommand = async (options: CheckCommandOptions): Promise<void> => {
  const { config, configPath } = await loadConfig();
  const mergedConfig = mergeConfigWithOptions(config, {
    input: options.input,
    output: options.output,
    ci: options.ci,
  });

  if (!mergedConfig.ci) {
    console.log(banner);
    printConfigInfo(configPath, mergedConfig);
  }

  const { envPath, examplePath } = getFilePaths(mergedConfig);

  // Check if input file exists
  if (!(await fs.pathExists(envPath))) {
    if (mergedConfig.ci) {
      console.error(`Error: No ${mergedConfig.input} file found`);
      process.exit(1);
    }
    console.log(pc.red('✗ ') + pc.bold(`No ${mergedConfig.input} file found`));
    console.log(pc.dim(`  Expected: ${envPath}`));
    process.exit(1);
  }

  const envContent = await readFileSafe(envPath);
  const exampleContent = await readFileSafe(examplePath);

  const envEntries = parseEnvContent(envContent, false);
  const exampleEntries = parseEnvContent(exampleContent, false);

  const envKeys = extractKeys(envEntries);
  const exampleKeys = extractKeys(exampleEntries);

  const result = detectDrift(envKeys, exampleKeys);

  if (mergedConfig.ci) {
    // CI mode - minimal output, proper exit codes
    if (result.isSynced) {
      console.log('✓ No drift detected');
      process.exit(0);
    } else {
      console.log('✗ Drift detected');
      if (result.missingInExample.length > 0) {
        console.log(`  Missing in ${mergedConfig.output}: ${result.missingInExample.join(', ')}`);
      }
      if (result.missingInLocal.length > 0) {
        console.log(`  Missing in ${mergedConfig.input}: ${result.missingInLocal.join(', ')}`);
      }
      process.exit(1);
    }
  }

  printDriftResult(result, mergedConfig);

  // Exit with code 1 if drift detected
  if (!result.isSynced) {
    process.exit(1);
  }
};

/**
 * SYNC command - Update .env.example with smart scrubbing
 */
interface SyncCommandOptions {
  input?: string;
  output?: string;
  dryRun?: boolean;
  strict?: boolean;
  ci?: boolean;
  merge?: boolean;
  sort?: boolean;
  ignore?: string[];
  preserveComments?: boolean;
}

const syncCommand = async (options: SyncCommandOptions): Promise<void> => {
  const { config, configPath } = await loadConfig();
  const mergedConfig = mergeConfigWithOptions(config, {
    input: options.input,
    output: options.output,
    strict: options.strict,
    ci: options.ci,
    merge: options.merge,
    sort: options.sort,
    ignore: options.ignore,
    preserveComments: options.preserveComments,
  });

  const syncOptions: SyncOptions = configToSyncOptions(mergedConfig);

  if (!mergedConfig.ci) {
    console.log(banner);
    printConfigInfo(configPath, mergedConfig);
  }

  const { envPath, examplePath } = getFilePaths(mergedConfig);

  // Check if input file exists
  if (!(await fs.pathExists(envPath))) {
    if (mergedConfig.ci) {
      console.error(`Error: No ${mergedConfig.input} file found`);
      process.exit(1);
    }
    console.log(pc.red('✗ ') + pc.bold(`No ${mergedConfig.input} file found`));
    console.log(pc.dim(`  Expected: ${envPath}`));
    process.exit(1);
  }

  // Show mode indicators
  if (!mergedConfig.ci) {
    if (mergedConfig.strict) {
      console.log(pc.yellow('⚠ ') + pc.bold(pc.yellow('STRICT MODE')) + pc.dim(' - All values will be scrubbed'));
    }
    if (mergedConfig.merge) {
      console.log(pc.blue('🔀 ') + pc.bold(pc.blue('MERGE MODE')) + pc.dim(' - Preserving existing keys'));
    }
    if (options.dryRun) {
      console.log(pc.cyan('ℹ ') + pc.bold(pc.cyan('DRY RUN')) + pc.dim(' - No files will be modified'));
    }

    console.log(pc.cyan('► ') + pc.bold(`Syncing ${mergedConfig.output}...`));
    console.log();
  }

  const envContent = await readFileSafe(envPath);
  const exampleContent = await readFileSafe(examplePath);

  const envEntries = parseEnvContent(envContent, mergedConfig.preserveComments);
  const exampleEntries = parseEnvContent(exampleContent, mergedConfig.preserveComments);

  // Generate synced content with smart scrubbing
  const { content: syncedContent, entries: syncedEntries, added, removed } = generateSyncedExample(
    envEntries,
    exampleEntries,
    syncOptions
  );

  // Dry run mode - just show what would happen
  if (options.dryRun) {
    if (mergedConfig.ci) {
      // CI dry run - simple output
      const scrubbedCount = syncedEntries.filter((e) => e.wasScrubbed).length;
      console.log(`Would scrub ${scrubbedCount} value(s)`);
      if (added.length > 0) console.log(`Would add ${added.length} key(s): ${added.join(', ')}`);
      if (removed.length > 0) console.log(`Would remove ${removed.length} key(s): ${removed.join(', ')}`);
      process.exit(0);
    }
    printDryRunTable(syncedEntries, added, removed);
    return;
  }

  // Write to output file
  await fs.writeFile(examplePath, syncedContent, 'utf-8');

  // CI mode - minimal output
  if (mergedConfig.ci) {
    const scrubbedCount = syncedEntries.filter((e) => e.wasScrubbed).length;
    console.log(`✓ ${mergedConfig.output} updated (${scrubbedCount} values scrubbed)`);
    process.exit(0);
  }

  console.log(pc.green('✓ ') + pc.bold(pc.green(`${mergedConfig.output} updated!`)));
  console.log();

  if (added.length > 0) {
    console.log(pc.green(`  Added ${added.length} new key(s):`));
    added.forEach((key) => {
      console.log(pc.green('    + ') + pc.white(key));
    });
  }

  if (removed.length > 0) {
    console.log(pc.red(`  Removed ${removed.length} key(s):`));
    removed.forEach((key) => {
      console.log(pc.red('    - ') + pc.white(key));
    });
  }

  if (added.length === 0 && removed.length === 0) {
    console.log(pc.dim('  No keys added or removed'));
  }

  // Show scrubbing stats
  const scrubbedCount = syncedEntries.filter((e) => e.wasScrubbed).length;
  console.log();
  console.log(pc.dim('─'.repeat(40)));
  console.log(pc.green('✓ ') + pc.dim(`${scrubbedCount} sensitive value(s) scrubbed`));
  console.log(pc.dim(`  Output: ${examplePath}`));
};

/**
 * INIT command - Initialize EnvDrift in current project
 */
interface InitCommandOptions {
  force?: boolean;
  hook?: boolean;
}

const initCommand = async (options: InitCommandOptions): Promise<void> => {
  console.log(banner);
  
  const cwd = process.cwd();
  const configPath = path.join(cwd, '.envdriftrc.json');

  // Check if config already exists
  if (await fs.pathExists(configPath)) {
    if (!options.force) {
      console.log(pc.yellow('⚠ ') + pc.bold('.envdriftrc.json already exists'));
      console.log(pc.dim('  Use --force to overwrite'));
      return;
    }
  }

  // Create config file
  const configContent = generateDefaultConfig();
  await fs.writeFile(configPath, configContent, 'utf-8');
  console.log(pc.green('✓ ') + pc.bold('Created .envdriftrc.json'));

  // Setup git pre-commit hook if requested
  if (options.hook) {
    const gitDir = path.join(cwd, '.git');
    if (await fs.pathExists(gitDir)) {
      const hooksDir = path.join(gitDir, 'hooks');
      await fs.ensureDir(hooksDir);
      
      const preCommitPath = path.join(hooksDir, 'pre-commit');
      const hookContent = `#!/bin/sh
# EnvDrift pre-commit hook
# Checks for env drift before allowing commit

echo "🛡️  EnvDrift: Checking for env drift..."

npx envdrift check --ci

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Commit blocked: env drift detected!"
  echo "   Run 'npx envdrift sync' to fix"
  exit 1
fi

echo "✓ No drift detected"
`;
      
      // Check if pre-commit hook already exists
      if (await fs.pathExists(preCommitPath)) {
        const existingHook = await fs.readFile(preCommitPath, 'utf-8');
        if (!existingHook.includes('envdrift')) {
          // Append to existing hook
          await fs.appendFile(preCommitPath, '\n' + hookContent);
          console.log(pc.green('✓ ') + pc.bold('Added EnvDrift to existing pre-commit hook'));
        } else {
          console.log(pc.dim('  Pre-commit hook already includes EnvDrift'));
        }
      } else {
        await fs.writeFile(preCommitPath, hookContent);
        await fs.chmod(preCommitPath, '755');
        console.log(pc.green('✓ ') + pc.bold('Created pre-commit hook'));
      }
    } else {
      console.log(pc.yellow('⚠ ') + pc.dim('No .git directory found, skipping hook setup'));
    }
  }

  console.log();
  console.log(pc.dim('─'.repeat(40)));
  console.log(pc.bold('Next steps:'));
  console.log(pc.dim('  1. Edit .envdriftrc.json to customize'));
  console.log(pc.dim('  2. Run ') + pc.green('envdrift check') + pc.dim(' to check for drift'));
  console.log(pc.dim('  3. Run ') + pc.green('envdrift sync') + pc.dim(' to sync files'));
  
  if (!options.hook) {
    console.log();
    console.log(pc.dim('💡 Tip: Run ') + pc.cyan('envdrift init --hook') + pc.dim(' to add a pre-commit hook'));
  }
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
  .option('-i, --input <file>', 'Input .env file (default: .env)')
  .option('-o, --output <file>', 'Output .env.example file (default: .env.example)')
  .option('--ci', 'CI mode - minimal output, proper exit codes')
  .action(checkCommand);

program
  .command('sync')
  .description('Sync and scrub .env.example with values from .env')
  .option('-i, --input <file>', 'Input .env file (default: .env)')
  .option('-o, --output <file>', 'Output .env.example file (default: .env.example)')
  .option('-d, --dry-run', 'Preview changes without modifying files')
  .option('-s, --strict', 'Scrub ALL values regardless of key name')
  .option('--ci', 'CI mode - minimal output, proper exit codes')
  .option('-m, --merge', 'Merge mode - add new keys without removing existing')
  .option('--sort', 'Sort keys alphabetically')
  .option('--ignore <keys...>', 'Keys to ignore (never scrub)')
  .option('--no-preserve-comments', 'Do not preserve comments')
  .action(syncCommand);

program
  .command('init')
  .description('Initialize EnvDrift in current project')
  .option('-f, --force', 'Overwrite existing config file')
  .option('--hook', 'Setup git pre-commit hook')
  .action(initCommand);

// Default to help if no command provided
if (process.argv.length < 3) {
  console.log(banner);
  program.help();
}

program.parse();
