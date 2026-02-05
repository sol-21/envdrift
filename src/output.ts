/**
 * EnvDrift Output Module
 * Handles all output formatting (text, JSON, quiet mode)
 */

import pc from 'picocolors';
import type { DriftResult, SyncedEntry } from './engine.js';
import type { EnvDriftConfig } from './config.js';

export type OutputFormat = 'text' | 'json';

export interface OutputOptions {
  format: OutputFormat;
  quiet: boolean;
  ci: boolean;
}

export interface DiffLine {
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  key: string;
  envValue?: string;
  exampleValue?: string;
}

import { VERSION } from './version.js';

// ASCII art banner
export const banner = `
${pc.green('╔═══════════════════════════════════════╗')}
${pc.green('║')}  ${pc.bold(pc.green('🛡️  EnvDrift'))}  ${pc.dim('v' + VERSION)}               ${pc.green('║')}
${pc.green('║')}  ${pc.dim('Sync .env files without leaking')}     ${pc.green('║')}
${pc.green('║')}  ${pc.dim('secrets.')}                            ${pc.green('║')}
${pc.green('╚═══════════════════════════════════════╝')}
`;

/**
 * Create output handler with given options
 */
export const createOutputHandler = (options: OutputOptions) => {
  const { format, quiet, ci } = options;

  return {
    /**
     * Print banner (text mode only, not in quiet/ci/json)
     */
    banner: () => {
      if (format === 'json' || quiet || ci) return;
      console.log(banner);
    },

    /**
     * Log message (respects quiet mode)
     */
    log: (message: string) => {
      if (quiet || format === 'json') return;
      console.log(message);
    },

    /**
     * Log info (dimmed)
     */
    info: (message: string) => {
      if (quiet || format === 'json') return;
      console.log(pc.dim(message));
    },

    /**
     * Log success
     */
    success: (message: string) => {
      if (format === 'json') return;
      if (quiet) {
        console.log(`✓ ${message}`);
        return;
      }
      console.log(pc.green('✓ ') + pc.bold(pc.green(message)));
    },

    /**
     * Log warning
     */
    warn: (message: string) => {
      if (format === 'json') return;
      console.log(pc.yellow('⚠ ') + message);
    },

    /**
     * Log error
     */
    error: (message: string) => {
      if (format === 'json') return;
      console.error(pc.red('✗ ') + pc.bold(pc.red(message)));
    },

    /**
     * Output JSON data
     */
    json: (data: object) => {
      if (format !== 'json') return;
      console.log(JSON.stringify(data, null, 2));
    },

    /**
     * Print config info
     */
    printConfigInfo: (configPath: string | null, config: EnvDriftConfig) => {
      if (format === 'json' || quiet || ci) return;
      if (configPath) {
        console.log(pc.dim(`📄 Config: ${configPath}`));
      }
      if (config.ignore?.length) {
        console.log(pc.dim(`🔓 Ignored keys: ${config.ignore.join(', ')}`));
      }
      if (config.alwaysScrub?.length) {
        console.log(pc.dim(`🔒 Always scrub: ${config.alwaysScrub.join(', ')}`));
      }
    },

    /**
     * Print drift results
     */
    printDriftResult: (result: DriftResult, config: EnvDriftConfig) => {
      if (format === 'json') {
        console.log(JSON.stringify({
          synced: result.isSynced,
          missingInExample: result.missingInExample,
          missingInEnv: result.missingInLocal,
          envKeyCount: result.envKeys.length,
          exampleKeyCount: result.exampleKeys.length,
        }, null, 2));
        return;
      }

      if (ci) {
        if (result.isSynced) {
          console.log('✓ No drift detected');
        } else {
          console.log('✗ Drift detected');
          if (result.missingInExample.length > 0) {
            console.log(`  Missing in ${config.output}: ${result.missingInExample.join(', ')}`);
          }
          if (result.missingInLocal.length > 0) {
            console.log(`  Missing in ${config.input}: ${result.missingInLocal.join(', ')}`);
          }
        }
        return;
      }

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
    },

    /**
     * Print dry-run table showing what would be written
     */
    printDryRunTable: (entries: SyncedEntry[], added: string[], removed: string[]) => {
      if (format === 'json') {
        console.log(JSON.stringify({
          dryRun: true,
          entries: entries.map(e => ({
            key: e.key,
            scrubbedValue: e.scrubbedValue,
            wasScrubbed: e.wasScrubbed,
            reason: e.reason,
          })),
          added,
          removed,
          summary: {
            total: entries.length,
            scrubbed: entries.filter(e => e.wasScrubbed).length,
            added: added.length,
            removed: removed.length,
          },
        }, null, 2));
        return;
      }

      if (ci) {
        const scrubbedCount = entries.filter((e) => e.wasScrubbed).length;
        console.log(`Would scrub ${scrubbedCount} value(s)`);
        if (added.length > 0) console.log(`Would add ${added.length} key(s): ${added.join(', ')}`);
        if (removed.length > 0) console.log(`Would remove ${removed.length} key(s): ${removed.join(', ')}`);
        return;
      }

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
    },

    /**
     * Print sync success message
     */
    printSyncSuccess: (
      outputFile: string,
      entries: SyncedEntry[],
      added: string[],
      removed: string[],
      outputPath: string
    ) => {
      const scrubbedCount = entries.filter((e) => e.wasScrubbed).length;

      if (format === 'json') {
        console.log(JSON.stringify({
          success: true,
          outputFile,
          entries: entries.map(e => ({
            key: e.key,
            scrubbedValue: e.scrubbedValue,
            wasScrubbed: e.wasScrubbed,
            reason: e.reason,
          })),
          added,
          removed,
          summary: {
            total: entries.length,
            scrubbed: scrubbedCount,
            added: added.length,
            removed: removed.length,
          },
        }, null, 2));
        return;
      }

      if (ci) {
        console.log(`✓ ${outputFile} updated (${scrubbedCount} values scrubbed)`);
        return;
      }

      console.log(pc.green('✓ ') + pc.bold(pc.green(`${outputFile} updated!`)));
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

      console.log();
      console.log(pc.dim('─'.repeat(40)));
      console.log(pc.green('✓ ') + pc.dim(`${scrubbedCount} sensitive value(s) scrubbed`));
      console.log(pc.dim(`  Output: ${outputPath}`));
    },

    /**
     * Print diff output
     */
    printDiff: (lines: DiffLine[], envFile: string, exampleFile: string) => {
      if (format === 'json') {
        console.log(JSON.stringify({
          envFile,
          exampleFile,
          diff: lines,
          summary: {
            added: lines.filter(l => l.type === 'added').length,
            removed: lines.filter(l => l.type === 'removed').length,
            modified: lines.filter(l => l.type === 'modified').length,
            unchanged: lines.filter(l => l.type === 'unchanged').length,
          },
        }, null, 2));
        return;
      }

      if (ci) {
        const added = lines.filter(l => l.type === 'added').length;
        const removed = lines.filter(l => l.type === 'removed').length;
        const modified = lines.filter(l => l.type === 'modified').length;
        console.log(`${added} added, ${removed} removed, ${modified} modified`);
        return;
      }

      console.log();
      console.log(pc.bold('Diff: ') + pc.dim(`${envFile} ↔ ${exampleFile}`));
      console.log(pc.dim('─'.repeat(60)));
      console.log();

      lines.forEach((line) => {
        switch (line.type) {
          case 'added':
            console.log(pc.green(`+ ${line.key}=${line.envValue || ''}`));
            break;
          case 'removed':
            console.log(pc.red(`- ${line.key}=${line.exampleValue || ''}`));
            break;
          case 'modified':
            console.log(pc.yellow(`~ ${line.key}`));
            console.log(pc.red(`  - ${line.exampleValue || '(empty)'}`));
            console.log(pc.green(`  + ${line.envValue || '(empty)'}`));
            break;
          case 'unchanged':
            console.log(pc.dim(`  ${line.key}=${line.envValue || ''}`));
            break;
        }
      });

      console.log();
      console.log(pc.dim('─'.repeat(60)));
      console.log(
        pc.green(`+ ${lines.filter(l => l.type === 'added').length} added`) + '  ' +
        pc.red(`- ${lines.filter(l => l.type === 'removed').length} removed`) + '  ' +
        pc.yellow(`~ ${lines.filter(l => l.type === 'modified').length} modified`)
      );
    },

    /**
     * Print interactive prompt
     */
    printInteractiveHeader: (key: string, entry: SyncedEntry) => {
      if (format === 'json' || ci) return;
      console.log();
      console.log(pc.bold(pc.cyan('─'.repeat(50))));
      console.log(pc.bold(`Key: ${key}`));
      console.log(pc.dim(`Original: ${entry.originalValue || '(empty)'}`));
      console.log(
        entry.wasScrubbed
          ? pc.yellow(`Scrubbed: ${entry.scrubbedValue}`)
          : pc.green(`Kept as: ${entry.scrubbedValue}`)
      );
      console.log(pc.dim(`Reason: ${entry.reason}`));
    },
  };
};
