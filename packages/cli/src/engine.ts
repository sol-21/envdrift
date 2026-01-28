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

export interface ScrubOptions {
  strictMode?: boolean;
}

export interface SyncedEntry {
  key: string;
  originalValue: string;
  scrubbedValue: string;
  wasScubbed: boolean;
  reason: string;
}

/**
 * EnvDrift signature comment
 */
export const ENVDRIFT_SIGNATURE = '# This file was synced and scrubbed by EnvDrift (https://github.com/sol-21/envdrift)';

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
 * Provider-specific regex patterns to detect secrets by VALUE (not key name)
 * This catches secrets even if the key name is misleading
 */
export const PROVIDER_PATTERNS: { name: string; pattern: RegExp }[] = [
  // AWS
  { name: 'AWS Access Key ID', pattern: /^AKIA[0-9A-Z]{16}$/ },
  { name: 'AWS Secret Access Key', pattern: /^[A-Za-z0-9/+=]{40}$/ },
  
  // Stripe (more permissive patterns)
  { name: 'Stripe Secret Key', pattern: /^sk_(live|test)_[a-zA-Z0-9]{20,}$/ },
  { name: 'Stripe Publishable Key', pattern: /^pk_(live|test)_[a-zA-Z0-9]{20,}$/ },
  { name: 'Stripe Restricted Key', pattern: /^rk_(live|test)_[a-zA-Z0-9]{20,}$/ },
  
  // GitHub
  { name: 'GitHub Personal Access Token (Classic)', pattern: /^ghp_[a-zA-Z0-9]{36}$/ },
  { name: 'GitHub OAuth Access Token', pattern: /^gho_[a-zA-Z0-9]{36}$/ },
  { name: 'GitHub App Token', pattern: /^ghu_[a-zA-Z0-9]{36}$/ },
  { name: 'GitHub App Installation Token', pattern: /^ghs_[a-zA-Z0-9]{36}$/ },
  { name: 'GitHub App Refresh Token', pattern: /^ghr_[a-zA-Z0-9]{36}$/ },
  { name: 'GitHub Fine-grained PAT', pattern: /^github_pat_[a-zA-Z0-9_]+$/ },
  
  // PostgreSQL / Database URLs
  { name: 'PostgreSQL Connection String', pattern: /^postgres(ql)?:\/\/.+/ },
  { name: 'MySQL Connection String', pattern: /^mysql:\/\/.+/ },
  { name: 'MongoDB Connection String', pattern: /^mongodb(\+srv)?:\/\/.+/ },
  { name: 'Redis Connection String', pattern: /^redis(s)?:\/\/.+/ },
  
  // Generic patterns
  { name: 'Bearer Token', pattern: /^Bearer\s+[a-zA-Z0-9\-_.]+/ },
  { name: 'JWT Token', pattern: /^eyJ[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+/ },
  { name: 'Base64 Encoded Secret (long)', pattern: /^[A-Za-z0-9+/]{64,}={0,2}$/ },
  
  // Cloud providers
  { name: 'Google API Key', pattern: /^AIza[0-9A-Za-z\-_]{35}$/ },
  { name: 'Slack Token', pattern: /^xox[baprs]-[0-9a-zA-Z\-]{10,}$/ },
  { name: 'Twilio Account SID', pattern: /^AC[a-f0-9]{32}$/ },
  { name: 'SendGrid API Key', pattern: /^SG\.[a-zA-Z0-9\-_]{22}\.[a-zA-Z0-9\-_]{43}$/ },
  { name: 'Mailgun API Key', pattern: /^key-[a-f0-9]{32}$/ },
  
  // NPM
  { name: 'NPM Token', pattern: /^npm_[a-zA-Z0-9]{36}$/ },
  
  // Heroku
  { name: 'Heroku API Key', pattern: /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/ },
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
 * Check if a value matches known provider secret patterns
 * Returns the provider name if matched, null otherwise
 */
export const detectProviderSecret = (value: string): string | null => {
  for (const { name, pattern } of PROVIDER_PATTERNS) {
    if (pattern.test(value)) {
      return name;
    }
  }
  return null;
};

/**
 * Smart scrub: replace sensitive values with placeholders
 * NEVER writes real values to .env.example
 * 
 * @param key - The environment variable key
 * @param value - The original value
 * @param options - Scrubbing options (strictMode, etc.)
 * @returns SyncedEntry with scrubbing details
 */
export const scrubValueDetailed = (
  key: string,
  value: string,
  options: ScrubOptions = {}
): SyncedEntry => {
  const placeholder = `YOUR_${key.toUpperCase()}_HERE`;

  // Strict mode: scrub everything
  if (options.strictMode) {
    return {
      key,
      originalValue: value,
      scrubbedValue: placeholder,
      wasScubbed: true,
      reason: 'Strict mode enabled',
    };
  }

  // Check if value matches provider patterns (catches misleading key names)
  const providerMatch = detectProviderSecret(value);
  if (providerMatch) {
    return {
      key,
      originalValue: value,
      scrubbedValue: placeholder,
      wasScubbed: true,
      reason: `Detected ${providerMatch}`,
    };
  }

  // Check if key name indicates sensitivity
  if (isSensitiveKey(key)) {
    return {
      key,
      originalValue: value,
      scrubbedValue: placeholder,
      wasScubbed: true,
      reason: 'Sensitive key name',
    };
  }

  // Non-sensitive: keep original value or use placeholder if empty
  return {
    key,
    originalValue: value,
    scrubbedValue: value || placeholder,
    wasScubbed: false,
    reason: 'Non-sensitive key',
  };
};

/**
 * Simple scrub function for backwards compatibility
 */
export const scrubValue = (key: string, value: string, options: ScrubOptions = {}): string => {
  return scrubValueDetailed(key, value, options).scrubbedValue;
};

/**
 * Generate synced .env.example content with smart scrubbing
 * Returns both the content and detailed sync entries for dry-run preview
 */
export const generateSyncedExample = (
  envEntries: EnvEntry[],
  existingExampleEntries: EnvEntry[],
  options: ScrubOptions = {}
): { content: string; entries: SyncedEntry[] } => {
  const existingExampleKeys = extractKeys(existingExampleEntries);
  const lines: string[] = [];
  const entries: SyncedEntry[] = [];

  // Add EnvDrift signature at the top
  lines.push(ENVDRIFT_SIGNATURE);
  lines.push('');

  // Start with existing example entries (preserve their order and comments)
  existingExampleEntries.forEach((entry) => {
    const envEntry = envEntries.find((e) => e.key === entry.key);
    if (envEntry) {
      // Key exists in both - use scrubbed value from .env
      const syncedEntry = scrubValueDetailed(entry.key, envEntry.value, options);
      entries.push(syncedEntry);
      lines.push(`${entry.key}=${syncedEntry.scrubbedValue}`);
    } else {
      // Key only in example - keep it as is
      const syncedEntry = scrubValueDetailed(entry.key, entry.value, options);
      entries.push(syncedEntry);
      lines.push(`${entry.key}=${syncedEntry.scrubbedValue}`);
    }
  });

  // Add new keys from .env that are missing in example
  const newKeys = envEntries.filter((entry) => !existingExampleKeys.includes(entry.key));
  if (newKeys.length > 0) {
    lines.push('');
    lines.push('# New keys added from .env');
    newKeys.forEach((entry) => {
      const syncedEntry = scrubValueDetailed(entry.key, entry.value, options);
      entries.push(syncedEntry);
      lines.push(`${entry.key}=${syncedEntry.scrubbedValue}`);
    });
  }

  return {
    content: lines.join('\n') + '\n',
    entries,
  };
};
