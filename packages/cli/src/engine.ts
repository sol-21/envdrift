/**
 * EnvDrift Core Engine
 * Shared logic for parsing, drift detection, and smart scrubbing
 */

export interface EnvEntry {
  key: string;
  value: string;
  line: number;
}

export interface DriftResult {
  isSynced: boolean;
  missingInExample: string[];
  missingInLocal: string[];
  envKeys: string[];
  exampleKeys: string[];
}

/**
 * Sensitive keywords for smart scrubbing
 */
const SENSITIVE_KEYWORDS = [
  'password',
  'pass',
  'secret',
  'key',
  'token',
  'auth',
  'api',
  'private',
  'credential',
  'jwt',
  'hash',
  'salt',
  'encrypt',
  'url',
  'uri',
  'connection',
  'dsn',
  'host',
  'port',
];

/**
 * Parse .env file content into key-value pairs
 */
export const parseEnvContent = (content: string): EnvEntry[] => {
  const lines = content.split('\n');
  const entries: EnvEntry[] = [];

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      return;
    }

    // Match KEY=VALUE pattern (value can be empty)
    const match = trimmedLine.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      entries.push({
        key,
        value: value.replace(/^["']|["']$/g, ''), // Remove surrounding quotes
        line: index + 1,
      });
    }
  });

  return entries;
};

/**
 * Extract just the keys from env entries
 */
export const extractKeys = (entries: EnvEntry[]): string[] => {
  return entries.map((entry) => entry.key);
};

/**
 * Detect drift between .env and .env.example
 */
export const detectDrift = (localKeys: string[], exampleKeys: string[]): DriftResult => {
  const missingInExample = localKeys.filter((key) => !exampleKeys.includes(key));
  const missingInLocal = exampleKeys.filter((key) => !localKeys.includes(key));

  return {
    isSynced: missingInExample.length === 0 && missingInLocal.length === 0,
    missingInExample,
    missingInLocal,
    envKeys: localKeys,
    exampleKeys,
  };
};

/**
 * Check if a key is sensitive based on common patterns
 */
export const isSensitiveKey = (key: string): boolean => {
  const lowerKey = key.toLowerCase();
  return SENSITIVE_KEYWORDS.some((keyword) => lowerKey.includes(keyword));
};

/**
 * Smart scrub: replace sensitive values with placeholders
 * NEVER writes real values to .env.example
 */
export const scrubValue = (key: string, value: string): string => {
  if (isSensitiveKey(key)) {
    return `YOUR_${key.toUpperCase()}_HERE`;
  }
  // For non-sensitive keys, keep the value or use a generic placeholder
  return value || `YOUR_${key.toUpperCase()}_HERE`;
};

/**
 * Generate synced .env.example content with smart scrubbing
 */
export const generateSyncedExample = (
  envEntries: EnvEntry[],
  existingExampleEntries: EnvEntry[]
): string => {
  const existingExampleKeys = extractKeys(existingExampleEntries);
  const lines: string[] = [];

  // Start with existing example entries (preserve their order and comments)
  existingExampleEntries.forEach((entry) => {
    const envEntry = envEntries.find((e) => e.key === entry.key);
    if (envEntry) {
      // Key exists in both - use scrubbed value from .env
      lines.push(`${entry.key}=${scrubValue(entry.key, envEntry.value)}`);
    } else {
      // Key only in example - keep it as is
      lines.push(`${entry.key}=${scrubValue(entry.key, entry.value)}`);
    }
  });

  // Add new keys from .env that are missing in example
  const newKeys = envEntries.filter((entry) => !existingExampleKeys.includes(entry.key));
  if (newKeys.length > 0) {
    lines.push('');
    lines.push('# New keys added from .env');
    newKeys.forEach((entry) => {
      lines.push(`${entry.key}=${scrubValue(entry.key, entry.value)}`);
    });
  }

  return lines.join('\n') + '\n';
};
