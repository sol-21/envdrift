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
  type SyncOptions,
} from './engine.js';
import {
  loadConfig,
  mergeConfigWithOptions,
  generateDefaultConfig,
  type EnvDriftConfig,
} from './config.js';
import { createOutputHandler, banner, type OutputFormat } from './output.js';
import { computeDiff, computeChangesOnly } from './diff.js';
import { startWatch } from './watch.js';
import { interactiveSync } from './interactive.js';

const VERSION = '1.1.0';

/**
 * Normalize path for cross-platform compatibility
 */
const normalizePath = (p: string): string => {
  return p.replace(/\\/g, '/');
};

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
 * Resolve multiple input files (.env, .env.local, etc.)
 */
const resolveEnvFiles = async (config: EnvDriftConfig): Promise<string[]> => {
  const cwd = process.cwd();
  const files: string[] = [];

  // Primary .env file
  const primaryPath = path.resolve(cwd, config.input || '.env');
  if (await fs.pathExists(primaryPath)) {
    files.push(primaryPath);
  }

  // Check for .env.local (Next.js/Vite pattern)
  const localPath = path.resolve(cwd, '.env.local');
  if (await fs.pathExists(localPath)) {
    files.push(localPath);
  }

  // Check for environment-specific files
  const envSpecificFiles = [
    '.env.development',
    '.env.development.local',
    '.env.production',
    '.env.production.local',
    '.env.test',
    '.env.test.local',
  ];

  for (const envFile of envSpecificFiles) {
    const envFilePath = path.resolve(cwd, envFile);
    if (await fs.pathExists(envFilePath)) {
      files.push(envFilePath);
    }
  }

  return files;
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
 * CHECK command - Detect drift between .env and .env.example
 */
interface CheckCommandOptions {
  input?: string;
  output?: string;
  ci?: boolean;
  json?: boolean;
  quiet?: boolean;
  all?: boolean;
}

const checkCommand = async (options: CheckCommandOptions): Promise<void> => {
  const { config, configPath } = await loadConfig();
  const mergedConfig = mergeConfigWithOptions(config, {
    input: options.input,
    output: options.output,
    ci: options.ci,
  });

  const format: OutputFormat = options.json ? 'json' : 'text';
  const out = createOutputHandler({
    format,
    quiet: options.quiet || false,
    ci: mergedConfig.ci || false,
  });

  out.banner();
  out.printConfigInfo(configPath, mergedConfig);

  const { envPath, examplePath } = getFilePaths(mergedConfig);

  // Check all .env files if --all flag is used
  if (options.all) {
    const envFiles = await resolveEnvFiles(mergedConfig);
    
    if (envFiles.length === 0) {
      out.error('No .env files found');
      process.exit(1);
    }

    if (format === 'json') {
      const results: Record<string, ReturnType<typeof detectDrift>> = {};
      
      for (const envFile of envFiles) {
        const envContent = await readFileSafe(envFile);
        const exampleContent = await readFileSafe(examplePath);
        const envEntries = parseEnvContent(envContent, false);
        const exampleEntries = parseEnvContent(exampleContent, false);
        const envKeys = extractKeys(envEntries);
        const exampleKeys = extractKeys(exampleEntries);
        results[normalizePath(path.relative(process.cwd(), envFile))] = detectDrift(envKeys, exampleKeys);
      }
      
      out.json({
        files: envFiles.map(f => normalizePath(path.relative(process.cwd(), f))),
        results,
        synced: Object.values(results).every(r => r.isSynced),
      });
      process.exit(Object.values(results).some(r => !r.isSynced) ? 1 : 0);
    }

    let hasDrift = false;
    for (const envFile of envFiles) {
      const relativePath = normalizePath(path.relative(process.cwd(), envFile));
      out.log(pc.bold(`\nChecking ${relativePath}...`));
      
      const envContent = await readFileSafe(envFile);
      const exampleContent = await readFileSafe(examplePath);
      const envEntries = parseEnvContent(envContent, false);
      const exampleEntries = parseEnvContent(exampleContent, false);
      const envKeys = extractKeys(envEntries);
      const exampleKeys = extractKeys(exampleEntries);
      const result = detectDrift(envKeys, exampleKeys);
      
      if (!result.isSynced) {
        hasDrift = true;
      }
      
      out.printDriftResult(result, { ...mergedConfig, input: relativePath });
    }
    
    process.exit(hasDrift ? 1 : 0);
  }

  // Check if input file exists
  if (!(await fs.pathExists(envPath))) {
    if (format === 'json') {
      out.json({ error: `No ${mergedConfig.input} file found` });
    } else {
      out.error(`No ${mergedConfig.input} file found`);
      out.info(`  Expected: ${envPath}`);
    }
    process.exit(1);
  }

  const envContent = await readFileSafe(envPath);
  const exampleContent = await readFileSafe(examplePath);

  const envEntries = parseEnvContent(envContent, false);
  const exampleEntries = parseEnvContent(exampleContent, false);

  const envKeys = extractKeys(envEntries);
  const exampleKeys = extractKeys(exampleEntries);

  const result = detectDrift(envKeys, exampleKeys);

  out.printDriftResult(result, mergedConfig);

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
  json?: boolean;
  quiet?: boolean;
  interactive?: boolean;
  watch?: boolean;
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

  const format: OutputFormat = options.json ? 'json' : 'text';
  const out = createOutputHandler({
    format,
    quiet: options.quiet || false,
    ci: mergedConfig.ci || false,
  });

  const syncOptions: SyncOptions = configToSyncOptions(mergedConfig);

  // Watch mode
  if (options.watch) {
    out.banner();
    out.printConfigInfo(configPath, mergedConfig);

    const { stop } = startWatch({
      config: mergedConfig,
      dryRun: options.dryRun,
      onSync: ({ added, removed, scrubbed }) => {
        if (!options.quiet) {
          if (added.length) console.log(pc.green(`  + ${added.length} added`));
          if (removed.length) console.log(pc.red(`  - ${removed.length} removed`));
          console.log(pc.dim(`  ${scrubbed} values scrubbed`));
        }
      },
      onError: (error) => {
        out.error(error.message);
      },
    });

    // Handle Ctrl+C
    process.on('SIGINT', () => {
      stop();
      process.exit(0);
    });

    return; // Keep process running
  }

  out.banner();
  out.printConfigInfo(configPath, mergedConfig);

  const { envPath, examplePath } = getFilePaths(mergedConfig);

  // Check if input file exists
  if (!(await fs.pathExists(envPath))) {
    if (format === 'json') {
      out.json({ error: `No ${mergedConfig.input} file found` });
    } else {
      out.error(`No ${mergedConfig.input} file found`);
      out.info(`  Expected: ${envPath}`);
    }
    process.exit(1);
  }

  // Show mode indicators
  if (!mergedConfig.ci && format !== 'json' && !options.quiet) {
    if (mergedConfig.strict) {
      console.log(pc.yellow('⚠ ') + pc.bold(pc.yellow('STRICT MODE')) + pc.dim(' - All values will be scrubbed'));
    }
    if (mergedConfig.merge) {
      console.log(pc.blue('🔀 ') + pc.bold(pc.blue('MERGE MODE')) + pc.dim(' - Preserving existing keys'));
    }
    if (options.interactive) {
      console.log(pc.magenta('🎛  ') + pc.bold(pc.magenta('INTERACTIVE MODE')) + pc.dim(' - Approve each change'));
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
  let { content: syncedContent, entries: syncedEntries, added, removed } = generateSyncedExample(
    envEntries,
    exampleEntries,
    syncOptions
  );

  // Interactive mode
  if (options.interactive && !mergedConfig.ci && format !== 'json') {
    const result = await interactiveSync(syncedEntries);
    
    if (result.skipped.length > 0) {
      // Remove skipped entries
      syncedEntries = result.entries;
      
      // Regenerate content
      const lines: string[] = [];
      lines.push(`# This file was synced and scrubbed by EnvDrift`);
      lines.push(`# https://github.com/sol-21/envdrift`);
      lines.push('');
      
      syncedEntries.forEach(entry => {
        if (entry.precedingComments?.length) {
          lines.push(...entry.precedingComments);
        }
        let line = `${entry.key}=${entry.scrubbedValue}`;
        if (entry.comment) {
          line += ` ${entry.comment}`;
        }
        lines.push(line);
      });
      
      syncedContent = lines.join('\n') + '\n';
      
      console.log();
      console.log(pc.dim(`Skipped ${result.skipped.length} key(s): ${result.skipped.join(', ')}`));
    }
  }

  // Dry run mode - just show what would happen
  if (options.dryRun) {
    out.printDryRunTable(syncedEntries, added, removed);
    return;
  }

  // Write to output file
  await fs.writeFile(examplePath, syncedContent, 'utf-8');

  out.printSyncSuccess(
    mergedConfig.output || '.env.example',
    syncedEntries,
    added,
    removed,
    examplePath
  );
};

/**
 * DIFF command - Show diff between .env and .env.example
 */
interface DiffCommandOptions {
  input?: string;
  output?: string;
  json?: boolean;
  quiet?: boolean;
  changesOnly?: boolean;
}

const diffCommand = async (options: DiffCommandOptions): Promise<void> => {
  const { config, configPath } = await loadConfig();
  const mergedConfig = mergeConfigWithOptions(config, {
    input: options.input,
    output: options.output,
  });

  const format: OutputFormat = options.json ? 'json' : 'text';
  const out = createOutputHandler({
    format,
    quiet: options.quiet || false,
    ci: false,
  });

  out.banner();
  out.printConfigInfo(configPath, mergedConfig);

  const { envPath, examplePath } = getFilePaths(mergedConfig);

  // Check if both files exist
  if (!(await fs.pathExists(envPath))) {
    if (format === 'json') {
      out.json({ error: `No ${mergedConfig.input} file found` });
    } else {
      out.error(`No ${mergedConfig.input} file found`);
    }
    process.exit(1);
  }

  if (!(await fs.pathExists(examplePath))) {
    if (format === 'json') {
      out.json({ error: `No ${mergedConfig.output} file found` });
    } else {
      out.error(`No ${mergedConfig.output} file found`);
    }
    process.exit(1);
  }

  const envContent = await readFileSafe(envPath);
  const exampleContent = await readFileSafe(examplePath);

  const envEntries = parseEnvContent(envContent, false);
  const exampleEntries = parseEnvContent(exampleContent, false);

  const diffResult = options.changesOnly
    ? computeChangesOnly(envEntries, exampleEntries)
    : computeDiff(envEntries, exampleEntries);

  out.printDiff(
    diffResult.lines,
    mergedConfig.input || '.env',
    mergedConfig.output || '.env.example'
  );

  // Exit with code 1 if there are changes
  if (diffResult.added > 0 || diffResult.removed > 0 || diffResult.modified > 0) {
    process.exit(1);
  }
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

/**
 * SCAN command - Scan all .env files in project
 */
interface ScanCommandOptions {
  json?: boolean;
  quiet?: boolean;
}

const scanCommand = async (options: ScanCommandOptions): Promise<void> => {
  const { config, configPath } = await loadConfig();

  const format: OutputFormat = options.json ? 'json' : 'text';
  const out = createOutputHandler({
    format,
    quiet: options.quiet || false,
    ci: false,
  });

  out.banner();
  out.printConfigInfo(configPath, config);

  const envFiles = await resolveEnvFiles(config);

  if (format === 'json') {
    const fileDetails = await Promise.all(
      envFiles.map(async (filePath) => {
        const content = await readFileSafe(filePath);
        const entries = parseEnvContent(content, false);
        return {
          path: normalizePath(path.relative(process.cwd(), filePath)),
          keyCount: entries.length,
          keys: extractKeys(entries),
        };
      })
    );
    
    out.json({
      files: fileDetails,
      totalFiles: envFiles.length,
      totalKeys: fileDetails.reduce((sum, f) => sum + f.keyCount, 0),
    });
    return;
  }

  if (envFiles.length === 0) {
    out.warn('No .env files found in project');
    return;
  }

  console.log(pc.bold(`Found ${envFiles.length} .env file(s):`));
  console.log();

  for (const filePath of envFiles) {
    const relativePath = normalizePath(path.relative(process.cwd(), filePath));
    const content = await readFileSafe(filePath);
    const entries = parseEnvContent(content, false);
    
    console.log(pc.green('  ✓ ') + pc.white(relativePath) + pc.dim(` (${entries.length} keys)`));
  }

  console.log();
  console.log(pc.dim('─'.repeat(40)));
  console.log(pc.dim(`Run ${pc.green('envdrift check --all')} to check all files`));
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
  .option('--json', 'Output results as JSON')
  .option('-q, --quiet', 'Suppress all output except errors')
  .option('-a, --all', 'Check all .env files (.env, .env.local, .env.development, etc.)')
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
  .option('--json', 'Output results as JSON')
  .option('-q, --quiet', 'Suppress all output except errors')
  .option('-I, --interactive', 'Interactive mode - approve each change')
  .option('-w, --watch', 'Watch mode - auto-sync on file changes')
  .action(syncCommand);

program
  .command('diff')
  .description('Show diff between .env and .env.example')
  .option('-i, --input <file>', 'Input .env file (default: .env)')
  .option('-o, --output <file>', 'Output .env.example file (default: .env.example)')
  .option('--json', 'Output results as JSON')
  .option('-q, --quiet', 'Suppress all output except errors')
  .option('-c, --changes-only', 'Only show changes, hide unchanged keys')
  .action(diffCommand);

program
  .command('init')
  .description('Initialize EnvDrift in current project')
  .option('-f, --force', 'Overwrite existing config file')
  .option('--hook', 'Setup git pre-commit hook')
  .action(initCommand);

program
  .command('scan')
  .description('Scan project for all .env files')
  .option('--json', 'Output results as JSON')
  .option('-q, --quiet', 'Suppress all output except errors')
  .action(scanCommand);

// Default to help if no command provided
if (process.argv.length < 3) {
  console.log(banner);
  program.help();
}

program.parse();
