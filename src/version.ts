/**
 * Version utility - reads version from package.json
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get version from package.json
const getVersion = (): string => {
  try {
    // For ESM, we need to use createRequire
    const require = createRequire(import.meta.url);
    const pkg = require('../package.json');
    return pkg.version;
  } catch {
    // Fallback for edge cases
    return '2.0.0';
  }
};

export const VERSION = getVersion();
