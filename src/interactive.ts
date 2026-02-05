/**
 * EnvDrift Interactive Module
 * Interactive prompts for sync command and init wizard
 */

import readline from 'readline';
import pc from 'picocolors';
import type { SyncedEntry } from './engine.js';
import type { EnvDriftConfig } from './config.js';

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

/**
 * Ask for a string input with optional default
 */
const askString = async (
  rl: readline.Interface,
  question: string,
  defaultValue?: string
): Promise<string> => {
  return new Promise((resolve) => {
    const prompt = defaultValue
      ? `${question} ${pc.dim(`(${defaultValue})`)}: `
      : `${question}: `;
    rl.question(prompt, (answer) => {
      resolve(answer.trim() || defaultValue || '');
    });
  });
};

/**
 * Ask for a comma-separated list
 */
const askList = async (
  rl: readline.Interface,
  question: string,
  defaultValue: string[] = []
): Promise<string[]> => {
  return new Promise((resolve) => {
    const defaultStr = defaultValue.length > 0 ? defaultValue.join(', ') : 'none';
    const prompt = `${question} ${pc.dim(`(${defaultStr})`)}: `;
    rl.question(prompt, (answer) => {
      if (!answer.trim()) {
        resolve(defaultValue);
        return;
      }
      const items = answer
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      resolve(items);
    });
  });
};

/**
 * Ask for a choice from options
 */
const askChoice = async (
  rl: readline.Interface,
  question: string,
  options: { value: string; label: string }[],
  defaultIndex: number = 0
): Promise<string> => {
  console.log(pc.cyan('? ') + question);
  options.forEach((opt, i) => {
    const marker = i === defaultIndex ? pc.green('❯') : ' ';
    console.log(`  ${marker} ${pc.bold(opt.value)} - ${pc.dim(opt.label)}`);
  });
  
  return new Promise((resolve) => {
    rl.question(pc.dim(`Enter choice (${options.map(o => o.value).join('/')}): `), (answer) => {
      const normalized = answer.trim().toLowerCase();
      const match = options.find(o => o.value.toLowerCase() === normalized);
      resolve(match ? match.value : options[defaultIndex].value);
    });
  });
};

export interface InitWizardResult {
  config: EnvDriftConfig;
  setupHook: boolean;
}

/**
 * Interactive init wizard
 */
export const initWizard = async (): Promise<InitWizardResult> => {
  const rl = createReadline();
  
  console.log();
  console.log(pc.bold(pc.cyan('🛡️  EnvDrift Setup Wizard')));
  console.log(pc.dim('Answer a few questions to configure EnvDrift for your project.'));
  console.log(pc.dim('Press Enter to accept defaults.'));
  console.log();

  try {
    // Input file
    const input = await askString(rl, pc.cyan('? ') + 'Input .env file', '.env');
    
    // Output file
    const output = await askString(rl, pc.cyan('? ') + 'Output example file', '.env.example');
    
    // Strict mode
    console.log();
    console.log(pc.cyan('? ') + 'Scrubbing mode:');
    console.log(`  ${pc.green('❯')} ${pc.bold('smart')} - ${pc.dim('Scrub only detected secrets (recommended)')}`);
    console.log(`    ${pc.bold('strict')} - ${pc.dim('Scrub ALL values (paranoid mode)')}`);
    const modeAnswer = await askString(rl, pc.dim('  Enter choice (smart/strict)'), 'smart');
    const strict = modeAnswer.toLowerCase() === 'strict';
    
    // Keys to ignore
    console.log();
    const ignore = await askList(
      rl,
      pc.cyan('? ') + 'Keys to never scrub (comma-separated)',
      ['NODE_ENV', 'DEBUG']
    );
    
    // Always scrub keys
    const alwaysScrub = await askList(
      rl,
      pc.cyan('? ') + 'Keys to always scrub (comma-separated)',
      []
    );
    
    // Custom sensitive keywords
    console.log();
    const sensitiveKeywords = await askList(
      rl,
      pc.cyan('? ') + 'Additional sensitive keywords (comma-separated)',
      []
    );
    
    // Custom provider patterns
    console.log();
    console.log(pc.cyan('? ') + 'Custom secret patterns (regex):');
    console.log(pc.dim('  Add patterns to detect custom secrets. Format: name:regex'));
    console.log(pc.dim('  Example: MyService:^myservice_[a-z0-9]{32}$'));
    const customPatternsInput = await askString(rl, pc.dim('  Enter patterns (comma-separated, or skip)'), '');
    
    const customPatterns: { name: string; pattern: string }[] = [];
    if (customPatternsInput) {
      const parts = customPatternsInput.split(',').map(s => s.trim());
      for (const part of parts) {
        const colonIndex = part.indexOf(':');
        if (colonIndex > 0) {
          customPatterns.push({
            name: part.substring(0, colonIndex).trim(),
            pattern: part.substring(colonIndex + 1).trim(),
          });
        }
      }
    }
    
    // Preserve comments
    console.log();
    const preserveComments = await askYesNo(
      rl,
      pc.cyan('? ') + 'Preserve comments from .env? [Y/n]: '
    );
    
    // Sort keys
    const sort = await askYesNo(
      rl,
      pc.cyan('? ') + 'Sort keys alphabetically? [y/N]: '
    );
    
    // Git hook
    console.log();
    const setupHook = await askYesNo(
      rl,
      pc.cyan('? ') + 'Setup git pre-commit hook? [Y/n]: '
    );

    const config: EnvDriftConfig = {
      input,
      output,
      strict,
      ignore,
      alwaysScrub,
      sensitiveKeywords,
      customPatterns: customPatterns.length > 0 ? customPatterns : undefined,
      preserveComments,
      merge: false,
      sort,
      groupByPrefix: false,
    };

    return { config, setupHook };
  } finally {
    rl.close();
  }
};
