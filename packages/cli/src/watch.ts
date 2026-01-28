/**
 * EnvDrift Watch Module
 * File watching functionality for auto-sync
 */

import fs from 'fs-extra';
import path from 'path';
import pc from 'picocolors';
import type { EnvDriftConfig } from './config.js';
import {
  parseEnvContent,
  extractKeys,
  detectDrift,
  generateSyncedExample,
  configToSyncOptions,
} from './engine.js';

export interface WatchOptions {
  config: EnvDriftConfig;
  dryRun?: boolean;
  onSync?: (result: { added: string[]; removed: string[]; scrubbed: number }) => void;
  onError?: (error: Error) => void;
}

let watchTimeout: ReturnType<typeof setTimeout> | null = null;
let isProcessing = false;

/**
 * Debounce file changes
 */
const debounce = <T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  return (...args: Parameters<T>) => {
    if (watchTimeout) {
      clearTimeout(watchTimeout);
    }
    watchTimeout = setTimeout(() => fn(...args), delay);
  };
};

/**
 * Process file change
 */
const processChange = async (options: WatchOptions): Promise<void> => {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const { config, dryRun, onSync, onError } = options;
    const cwd = process.cwd();
    const envPath = path.resolve(cwd, config.input || '.env');
    const examplePath = path.resolve(cwd, config.output || '.env.example');

    // Check if input file exists
    if (!(await fs.pathExists(envPath))) {
      return;
    }

    const envContent = await fs.readFile(envPath, 'utf-8');
    const exampleContent = await fs.pathExists(examplePath) 
      ? await fs.readFile(examplePath, 'utf-8') 
      : '';

    const envEntries = parseEnvContent(envContent, config.preserveComments);
    const exampleEntries = parseEnvContent(exampleContent, config.preserveComments);
    const syncOptions = configToSyncOptions(config);

    // Generate synced content
    const { content, entries, added, removed } = generateSyncedExample(
      envEntries,
      exampleEntries,
      syncOptions
    );

    const scrubbedCount = entries.filter(e => e.wasScrubbed).length;

    // Check if there are actual changes
    const envKeys = extractKeys(envEntries);
    const exampleKeys = extractKeys(exampleEntries);
    const drift = detectDrift(envKeys, exampleKeys);

    if (drift.isSynced && exampleContent === content) {
      // No changes needed
      return;
    }

    if (!dryRun) {
      await fs.writeFile(examplePath, content, 'utf-8');
    }

    if (onSync) {
      onSync({ added, removed, scrubbed: scrubbedCount });
    }
  } catch (error) {
    if (options.onError) {
      options.onError(error as Error);
    }
  } finally {
    isProcessing = false;
  }
};

/**
 * Start watching for file changes
 */
export const startWatch = (options: WatchOptions): { stop: () => void } => {
  const { config } = options;
  const cwd = process.cwd();
  const envPath = path.resolve(cwd, config.input || '.env');

  console.log(pc.cyan('👁  ') + pc.bold('Watching for changes...'));
  console.log(pc.dim(`   ${config.input} → ${config.output}`));
  console.log(pc.dim('   Press Ctrl+C to stop'));
  console.log();

  // Create debounced handler
  const handleChange = debounce(() => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(pc.dim(`[${timestamp}]`) + pc.yellow(' File changed, syncing...'));
    processChange(options).then(() => {
      if (!options.dryRun) {
        console.log(pc.dim(`[${timestamp}]`) + pc.green(' ✓ Synced'));
      } else {
        console.log(pc.dim(`[${timestamp}]`) + pc.cyan(' Would sync (dry-run)'));
      }
    });
  }, 300);

  // Watch the .env file
  const watcher = fs.watch(envPath, (eventType: string) => {
    if (eventType === 'change') {
      handleChange();
    }
  });

  // Also watch for .env.local files if they exist (Next.js/Vite pattern)
  const localEnvPath = path.resolve(cwd, '.env.local');
  let localWatcher: fs.FSWatcher | null = null;
  
  if (fs.existsSync(localEnvPath)) {
    localWatcher = fs.watch(localEnvPath, (eventType: string) => {
      if (eventType === 'change') {
        handleChange();
      }
    });
  }

  // Return stop function
  return {
    stop: () => {
      watcher.close();
      if (localWatcher) {
        localWatcher.close();
      }
      if (watchTimeout) {
        clearTimeout(watchTimeout);
      }
      console.log();
      console.log(pc.dim('Watch stopped'));
    },
  };
};
