/**
 * EnvDrift Core Engine
 * Shared logic for parsing, drift detection, and smart scrubbing
 */

import type { EnvDriftConfig } from './config.js';

// Re-export config utilities for extension use
export { loadConfig, type EnvDriftConfig } from './config.js';

export interface EnvEntry {
  key: string;
  value: string;
  line: number;
  comment?: string;         // Inline comment after value
  precedingComments?: string[]; // Comments on lines before this entry
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
  ignore?: string[];
  alwaysScrub?: string[];
  customSensitiveKeywords?: string[];
  customPatterns?: { name: string; pattern: string }[];
  placeholderFormat?: string;
}

export interface SyncedEntry {
  key: string;
  originalValue: string;
  scrubbedValue: string;
  wasScrubbed: boolean;
  reason: string;
  comment?: string;
  precedingComments?: string[];
}

export interface SyncOptions extends ScrubOptions {
  preserveComments?: boolean;
  merge?: boolean;
  sort?: boolean;
  groupByPrefix?: boolean;
}

/**
 * EnvDrift signature comment
 */
export const ENVDRIFT_SIGNATURE = `# This file was synced and scrubbed by EnvDrift
# https://github.com/sol-21/envdrift`;

/**
 * Sensitive keywords for smart scrubbing
 */
const DEFAULT_SENSITIVE_KEYWORDS = [
  'password',
  'pass',
  'pwd',
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
  'database',
  'db',
  'redis',
  'mongo',
  'postgres',
  'mysql',
  'smtp',
  'mail',
  'sendgrid',
  'twilio',
  'stripe',
  'aws',
  'gcp',
  'azure',
  'firebase',
  'supabase',
  'clerk',
  'oauth',
  'client_id',
  'client_secret',
  'access',
  'refresh',
  'bearer',
  'webhook',
  'signing',
  'encryption',
];

/**
 * Provider-specific regex patterns to detect secrets by VALUE (not key name)
 * This catches secrets even if the key name is misleading
 */
export const PROVIDER_PATTERNS: { name: string; pattern: RegExp }[] = [
  // AWS
  { name: 'AWS Access Key ID', pattern: /^AKIA[0-9A-Z]{16}$/ },
  { name: 'AWS Secret Access Key', pattern: /^[A-Za-z0-9/+=]{40}$/ },
  
  // Stripe
  { name: 'Stripe Secret Key', pattern: /^sk_(live|test)_[a-zA-Z0-9]{20,}$/ },
  { name: 'Stripe Publishable Key', pattern: /^pk_(live|test)_[a-zA-Z0-9]{20,}$/ },
  { name: 'Stripe Restricted Key', pattern: /^rk_(live|test)_[a-zA-Z0-9]{20,}$/ },
  { name: 'Stripe Webhook Secret', pattern: /^whsec_[a-zA-Z0-9]{20,}$/ },
  
  // GitHub
  { name: 'GitHub Personal Access Token (Classic)', pattern: /^ghp_[a-zA-Z0-9]{36}$/ },
  { name: 'GitHub OAuth Access Token', pattern: /^gho_[a-zA-Z0-9]{36}$/ },
  { name: 'GitHub App Token', pattern: /^ghu_[a-zA-Z0-9]{36}$/ },
  { name: 'GitHub App Installation Token', pattern: /^ghs_[a-zA-Z0-9]{36}$/ },
  { name: 'GitHub App Refresh Token', pattern: /^ghr_[a-zA-Z0-9]{36}$/ },
  { name: 'GitHub Fine-grained PAT', pattern: /^github_pat_[a-zA-Z0-9_]+$/ },
  
  // GitLab
  { name: 'GitLab Personal Access Token', pattern: /^glpat-[a-zA-Z0-9\-_]{20,}$/ },
  { name: 'GitLab Pipeline Token', pattern: /^glptt-[a-zA-Z0-9\-_]{20,}$/ },
  
  // Database URLs
  { name: 'PostgreSQL Connection String', pattern: /^postgres(ql)?:\/\/.+/ },
  { name: 'MySQL Connection String', pattern: /^mysql:\/\/.+/ },
  { name: 'MongoDB Connection String', pattern: /^mongodb(\+srv)?:\/\/.+/ },
  { name: 'Redis Connection String', pattern: /^redis(s)?:\/\/.+/ },
  { name: 'SQLite Connection String', pattern: /^sqlite:\/\/.+/ },
  
  // Generic patterns
  { name: 'Bearer Token', pattern: /^Bearer\s+[a-zA-Z0-9\-_.]+/ },
  { name: 'JWT Token', pattern: /^eyJ[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+/ },
  { name: 'Base64 Encoded Secret (long)', pattern: /^[A-Za-z0-9+/]{64,}={0,2}$/ },
  
  // Cloud providers
  { name: 'Google API Key', pattern: /^AIza[0-9A-Za-z\-_]{35}$/ },
  { name: 'Google OAuth Client ID', pattern: /^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/ },
  { name: 'Slack Token', pattern: /^xox[baprs]-[0-9a-zA-Z\-]{10,}$/ },
  { name: 'Slack Webhook URL', pattern: /^https:\/\/hooks\.slack\.com\/services\/.+/ },
  { name: 'Discord Webhook URL', pattern: /^https:\/\/(discord|discordapp)\.com\/api\/webhooks\/.+/ },
  { name: 'Twilio Account SID', pattern: /^AC[a-f0-9]{32}$/ },
  { name: 'Twilio Auth Token', pattern: /^[a-f0-9]{32}$/ },
  { name: 'SendGrid API Key', pattern: /^SG\.[a-zA-Z0-9\-_]{22}\.[a-zA-Z0-9\-_]{43}$/ },
  { name: 'Mailgun API Key', pattern: /^key-[a-f0-9]{32}$/ },
  { name: 'Mailchimp API Key', pattern: /^[a-f0-9]{32}-us[0-9]{1,2}$/ },
  
  // NPM
  { name: 'NPM Token', pattern: /^npm_[a-zA-Z0-9]{36}$/ },
  
  // Heroku
  { name: 'Heroku API Key', pattern: /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/ },
  
  // OpenAI / AI
  { name: 'OpenAI API Key', pattern: /^sk-[a-zA-Z0-9]{48}$/ },
  { name: 'Anthropic API Key', pattern: /^sk-ant-[a-zA-Z0-9\-_]+$/ },
  
  // Supabase
  { name: 'Supabase Anon Key', pattern: /^eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+$/ },
  
  // Clerk
  { name: 'Clerk Secret Key', pattern: /^sk_(test|live)_[a-zA-Z0-9]+$/ },
  { name: 'Clerk Publishable Key', pattern: /^pk_(test|live)_[a-zA-Z0-9]+$/ },
  
  // Private Keys (PEM format indicator)
  { name: 'Private Key (PEM)', pattern: /^-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/ },
  
  // Generic long hex strings (likely secrets)
  { name: 'Hex Secret (32+ chars)', pattern: /^[a-f0-9]{32,}$/i },
];

/**
 * Parse .env file content into key-value pairs with comments preservation
 */
export const parseEnvContent = (content: string, preserveComments = true): EnvEntry[] => {
  const lines = content.split('\n');
  const entries: EnvEntry[] = [];
  let precedingComments: string[] = [];

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    // Collect comments
    if (trimmedLine.startsWith('#')) {
      if (preserveComments) {
        precedingComments.push(trimmedLine);
      }
      return;
    }

    // Skip empty lines (but reset comments if blank line between)
    if (!trimmedLine) {
      if (preserveComments && precedingComments.length > 0) {
        // Keep comments for next entry
      }
      return;
    }

    // Match KEY=VALUE pattern with optional inline comment
    const match = trimmedLine.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match) {
      const [, key, rawValue] = match;
      
      // Check for inline comment
      let value = rawValue;
      let inlineComment: string | undefined;
      
      // Handle quoted values
      if (rawValue.startsWith('"') || rawValue.startsWith("'")) {
        const quote = rawValue[0];
        const endQuoteIndex = rawValue.indexOf(quote, 1);
        if (endQuoteIndex > 0) {
          value = rawValue.substring(1, endQuoteIndex);
          const afterQuote = rawValue.substring(endQuoteIndex + 1).trim();
          if (afterQuote.startsWith('#')) {
            inlineComment = afterQuote;
          }
        }
      } else {
        // Unquoted value - check for inline comment
        const commentIndex = rawValue.indexOf(' #');
        if (commentIndex > 0) {
          value = rawValue.substring(0, commentIndex).trim();
          inlineComment = rawValue.substring(commentIndex + 1).trim();
        }
      }

      entries.push({
        key,
        value: value.replace(/^["']|["']$/g, ''),
        line: index + 1,
        comment: preserveComments ? inlineComment : undefined,
        precedingComments: preserveComments && precedingComments.length > 0 
          ? [...precedingComments] 
          : undefined,
      });

      // Reset preceding comments after adding entry
      precedingComments = [];
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
 * Get all sensitive keywords including custom ones
 */
const getSensitiveKeywords = (customKeywords: string[] = []): string[] => {
  return [...DEFAULT_SENSITIVE_KEYWORDS, ...customKeywords];
};

/**
 * Check if a key is sensitive based on common patterns
 */
export const isSensitiveKey = (key: string, customKeywords: string[] = []): boolean => {
  const lowerKey = key.toLowerCase();
  const keywords = getSensitiveKeywords(customKeywords);
  return keywords.some((keyword) => lowerKey.includes(keyword));
};

/**
 * Check if a value matches known provider secret patterns
 * Returns the provider name if matched, null otherwise
 */
export const detectProviderSecret = (
  value: string,
  customPatterns?: { name: string; pattern: string }[]
): string | null => {
  // Check built-in patterns first
  for (const { name, pattern } of PROVIDER_PATTERNS) {
    if (pattern.test(value)) {
      return name;
    }
  }
  
  // Check custom patterns
  if (customPatterns) {
    for (const { name, pattern } of customPatterns) {
      try {
        const regex = new RegExp(pattern);
        if (regex.test(value)) {
          return `Custom: ${name}`;
        }
      } catch {
        // Invalid regex, skip
      }
    }
  }
  
  return null;
};

/**
 * Generate placeholder for a key
 */
const generatePlaceholder = (key: string, format: string = 'YOUR_{KEY}_HERE'): string => {
  return format.replace('{KEY}', key.toUpperCase());
};

/**
 * Smart scrub: replace sensitive values with placeholders
 * NEVER writes real values to .env.example
 */
export const scrubValueDetailed = (
  key: string,
  value: string,
  options: ScrubOptions = {}
): SyncedEntry => {
  const placeholder = generatePlaceholder(key, options.placeholderFormat);

  // Check if key is in ignore list - never scrub
  if (options.ignore?.includes(key)) {
    return {
      key,
      originalValue: value,
      scrubbedValue: value || placeholder,
      wasScrubbed: false,
      reason: 'Ignored (in ignore list)',
    };
  }

  // Check if key is in alwaysScrub list - always scrub
  if (options.alwaysScrub?.includes(key)) {
    return {
      key,
      originalValue: value,
      scrubbedValue: placeholder,
      wasScrubbed: true,
      reason: 'Always scrub (in alwaysScrub list)',
    };
  }

  // Strict mode: scrub everything
  if (options.strictMode) {
    return {
      key,
      originalValue: value,
      scrubbedValue: placeholder,
      wasScrubbed: true,
      reason: 'Strict mode enabled',
    };
  }

  // Check if value matches provider patterns (catches misleading key names)
  const providerMatch = detectProviderSecret(value, options.customPatterns);
  if (providerMatch) {
    return {
      key,
      originalValue: value,
      scrubbedValue: placeholder,
      wasScrubbed: true,
      reason: `Detected ${providerMatch}`,
    };
  }

  // Check if key name indicates sensitivity
  if (isSensitiveKey(key, options.customSensitiveKeywords)) {
    return {
      key,
      originalValue: value,
      scrubbedValue: placeholder,
      wasScrubbed: true,
      reason: 'Sensitive key name',
    };
  }

  // Non-sensitive: keep original value or use placeholder if empty
  return {
    key,
    originalValue: value,
    scrubbedValue: value || placeholder,
    wasScrubbed: false,
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
 * Group entries by prefix
 */
const groupEntriesByPrefix = (entries: SyncedEntry[]): Map<string, SyncedEntry[]> => {
  const groups = new Map<string, SyncedEntry[]>();
  
  entries.forEach((entry) => {
    const prefixMatch = entry.key.match(/^([A-Z]+)_/);
    const prefix = prefixMatch ? prefixMatch[1] : '_OTHER';
    
    if (!groups.has(prefix)) {
      groups.set(prefix, []);
    }
    groups.get(prefix)!.push(entry);
  });
  
  return groups;
};

/**
 * Generate synced .env.example content with smart scrubbing
 */
export const generateSyncedExample = (
  envEntries: EnvEntry[],
  existingExampleEntries: EnvEntry[],
  options: SyncOptions = {}
): { content: string; entries: SyncedEntry[]; added: string[]; removed: string[] } => {
  const existingExampleKeys = extractKeys(existingExampleEntries);
  const envKeys = extractKeys(envEntries);
  const lines: string[] = [];
  const entries: SyncedEntry[] = [];

  // Calculate what's being added/removed
  const added = envKeys.filter((key) => !existingExampleKeys.includes(key));
  const removed = options.merge 
    ? [] 
    : existingExampleKeys.filter((key) => !envKeys.includes(key));

  // Add EnvDrift signature at the top
  lines.push(ENVDRIFT_SIGNATURE);
  lines.push('');

  // Determine which entries to include
  let allEntries: EnvEntry[] = [];

  if (options.merge) {
    // Merge mode: keep all existing example entries, add new ones from env
    const existingKeys = new Set(existingExampleKeys);
    allEntries = [
      ...existingExampleEntries,
      ...envEntries.filter((e) => !existingKeys.has(e.key)),
    ];
  } else {
    // Normal mode: use env entries as source of truth
    allEntries = envEntries;
  }

  // Sort if requested
  if (options.sort) {
    allEntries = [...allEntries].sort((a, b) => a.key.localeCompare(b.key));
  }

  // Process entries
  const processEntry = (entry: EnvEntry): SyncedEntry => {
    const envEntry = envEntries.find((e) => e.key === entry.key);
    const valueToScrub = envEntry ? envEntry.value : entry.value;
    
    const syncedEntry = scrubValueDetailed(entry.key, valueToScrub, {
      strictMode: options.strictMode,
      ignore: options.ignore,
      alwaysScrub: options.alwaysScrub,
      customSensitiveKeywords: options.customSensitiveKeywords,
      placeholderFormat: options.placeholderFormat,
    });

    if (options.preserveComments) {
      syncedEntry.comment = entry.comment;
      syncedEntry.precedingComments = entry.precedingComments;
    }

    return syncedEntry;
  };

  // Group by prefix if requested
  if (options.groupByPrefix) {
    const processedEntries = allEntries.map(processEntry);
    const groups = groupEntriesByPrefix(processedEntries);
    const sortedPrefixes = Array.from(groups.keys()).sort();
    
    sortedPrefixes.forEach((prefix, idx) => {
      const groupEntries = groups.get(prefix)!;
      
      if (prefix !== '_OTHER') {
        lines.push(`# ${prefix}`);
      } else {
        lines.push('# Other');
      }
      
      groupEntries.forEach((entry) => {
        entries.push(entry);
        
        if (entry.precedingComments?.length) {
          lines.push(...entry.precedingComments);
        }
        
        let line = `${entry.key}=${entry.scrubbedValue}`;
        if (entry.comment) {
          line += ` ${entry.comment}`;
        }
        lines.push(line);
      });
      
      if (idx < sortedPrefixes.length - 1) {
        lines.push('');
      }
    });
  } else {
    // Normal processing
    allEntries.forEach((entry) => {
      const syncedEntry = processEntry(entry);
      entries.push(syncedEntry);

      if (options.preserveComments && syncedEntry.precedingComments?.length) {
        lines.push(...syncedEntry.precedingComments);
      }

      let line = `${entry.key}=${syncedEntry.scrubbedValue}`;
      if (options.preserveComments && syncedEntry.comment) {
        line += ` ${syncedEntry.comment}`;
      }
      lines.push(line);
    });
  }

  return {
    content: lines.join('\n') + '\n',
    entries,
    added,
    removed,
  };
};

/**
 * Convert EnvDriftConfig to SyncOptions
 */
export const configToSyncOptions = (config: EnvDriftConfig): SyncOptions => {
  return {
    strictMode: config.strict,
    ignore: config.ignore,
    alwaysScrub: config.alwaysScrub,
    customSensitiveKeywords: config.sensitiveKeywords,
    customPatterns: config.customPatterns,
    preserveComments: config.preserveComments,
    merge: config.merge,
    placeholderFormat: config.placeholderFormat,
    sort: config.sort,
    groupByPrefix: config.groupByPrefix,
  };
};
