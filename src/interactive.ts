/**
 * EnvDrift Interactive Module
 * Interactive prompts for sync command
 */

import readline from 'readline';
import pc from 'picocolors';
import type { SyncedEntry } from './engine.js';

export interface InteractiveResult {
  entries: SyncedEntry[];
  skipped: string[];
  overrides: Map<string, string>;
}

/**
 * Create readline interface
 */
const createReadline = () => {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
};

/**
 * Ask a yes/no question
 */
const askYesNo = async (rl: readline.Interface, question: string): Promise<boolean> => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      const normalized = answer.toLowerCase().trim();
      resolve(normalized === 'y' || normalized === 'yes' || normalized === '');
    });
  });
};

/**
 * Ask for custom value
 */
const askCustomValue = async (rl: readline.Interface, prompt: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
};

/**
 * Interactive sync - ask for approval on each entry
 */
export const interactiveSync = async (
  entries: SyncedEntry[]
): Promise<InteractiveResult> => {
  const rl = createReadline();
  const result: InteractiveResult = {
    entries: [],
    skipped: [],
    overrides: new Map(),
  };

  console.log();
  console.log(pc.bold(pc.cyan('Interactive Sync Mode')));
  console.log(pc.dim('For each entry, you can:'));
  console.log(pc.dim('  [Y/enter] Accept  [n] Skip  [c] Custom value  [q] Quit'));
  console.log();

  try {
    for (const entry of entries) {
      // Display entry info
      console.log(pc.cyan('─'.repeat(50)));
      console.log(pc.bold(`Key: `) + pc.white(entry.key));
      
      if (entry.wasScrubbed) {
        console.log(pc.dim(`Original: `) + pc.red(entry.originalValue || '(empty)'));
        console.log(pc.yellow(`Scrubbed: `) + pc.yellow(entry.scrubbedValue));
        console.log(pc.dim(`Reason: `) + pc.yellow(entry.reason));
      } else {
        console.log(pc.dim(`Value: `) + pc.green(entry.scrubbedValue));
        console.log(pc.dim(`Reason: `) + pc.green(entry.reason));
      }

      const answer = await askCustomValue(
        rl,
        pc.cyan('? ') + pc.bold('[Y/n/c/q]: ')
      );

      const normalized = answer.toLowerCase().trim();

      if (normalized === 'q' || normalized === 'quit') {
        console.log(pc.yellow('Sync cancelled'));
        break;
      }

      if (normalized === 'n' || normalized === 'no') {
        result.skipped.push(entry.key);
        console.log(pc.dim(`  Skipped ${entry.key}`));
        continue;
      }

      if (normalized === 'c' || normalized === 'custom') {
        const customValue = await askCustomValue(
          rl,
          pc.cyan('  Enter custom value: ')
        );
        result.overrides.set(entry.key, customValue);
        result.entries.push({
          ...entry,
          scrubbedValue: customValue,
        });
        console.log(pc.green(`  ✓ Using custom value`));
        continue;
      }

      // Accept (y, yes, or enter)
      result.entries.push(entry);
      console.log(pc.green(`  ✓ Accepted`));
    }
  } finally {
    rl.close();
  }

  return result;
};

/**
 * Confirm before proceeding
 */
export const confirmAction = async (message: string): Promise<boolean> => {
  const rl = createReadline();
  try {
    return await askYesNo(rl, pc.yellow('? ') + message + ' [Y/n]: ');
  } finally {
    rl.close();
  }
};
