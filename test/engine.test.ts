import { describe, it, expect } from 'vitest';
import {
  parseEnvContent,
  extractKeys,
  detectDrift,
  isSensitiveKey,
  detectProviderSecret,
  scrubValueDetailed,
  scrubValue,
  generateSyncedExample,
  PROVIDER_PATTERNS,
  ENVDRIFT_SIGNATURE,
} from '../src/engine.js';

describe('parseEnvContent', () => {
  it('should parse simple key-value pairs', () => {
    const content = `
FOO=bar
BAZ=qux
`;
    const entries = parseEnvContent(content);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ key: 'FOO', value: 'bar' });
    expect(entries[1]).toMatchObject({ key: 'BAZ', value: 'qux' });
  });

  it('should handle empty values', () => {
    const content = 'EMPTY=';
    const entries = parseEnvContent(content);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ key: 'EMPTY', value: '' });
  });

  it('should skip comments', () => {
    const content = `
# This is a comment
FOO=bar
# Another comment
BAZ=qux
`;
    const entries = parseEnvContent(content, false);
    expect(entries).toHaveLength(2);
  });

  it('should preserve preceding comments when option is true', () => {
    const content = `
# Database config
DATABASE_URL=postgres://localhost
`;
    const entries = parseEnvContent(content, true);
    expect(entries).toHaveLength(1);
    expect(entries[0].precedingComments).toEqual(['# Database config']);
  });

  it('should handle quoted values', () => {
    const content = `
DOUBLE_QUOTED="hello world"
SINGLE_QUOTED='foo bar'
`;
    const entries = parseEnvContent(content);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ key: 'DOUBLE_QUOTED', value: 'hello world' });
    expect(entries[1]).toMatchObject({ key: 'SINGLE_QUOTED', value: 'foo bar' });
  });

  it('should handle inline comments', () => {
    const content = 'FOO=bar # this is a comment';
    const entries = parseEnvContent(content, true);
    expect(entries).toHaveLength(1);
    expect(entries[0].value).toBe('bar');
    expect(entries[0].comment).toBe('# this is a comment');
  });

  it('should handle values with = sign', () => {
    const content = 'CONNECTION_STRING=postgres://user:pass@host/db?ssl=true';
    const entries = parseEnvContent(content);
    expect(entries).toHaveLength(1);
    expect(entries[0].value).toBe('postgres://user:pass@host/db?ssl=true');
  });

  it('should ignore invalid lines', () => {
    const content = `
VALID=value
this is not valid
ALSO_VALID=another
`;
    const entries = parseEnvContent(content);
    expect(entries).toHaveLength(2);
  });

  it('should handle underscores in keys', () => {
    const content = 'MY_LONG_KEY_NAME=value';
    const entries = parseEnvContent(content);
    expect(entries).toHaveLength(1);
    expect(entries[0].key).toBe('MY_LONG_KEY_NAME');
  });

  it('should handle numbers in keys', () => {
    const content = 'API_KEY_V2=value';
    const entries = parseEnvContent(content);
    expect(entries).toHaveLength(1);
    expect(entries[0].key).toBe('API_KEY_V2');
  });
});

describe('extractKeys', () => {
  it('should extract keys from entries', () => {
    const entries = [
      { key: 'FOO', value: 'bar', line: 1 },
      { key: 'BAZ', value: 'qux', line: 2 },
    ];
    expect(extractKeys(entries)).toEqual(['FOO', 'BAZ']);
  });

  it('should return empty array for empty entries', () => {
    expect(extractKeys([])).toEqual([]);
  });
});

describe('detectDrift', () => {
  it('should detect synced state when both have same keys', () => {
    const result = detectDrift(['A', 'B', 'C'], ['A', 'B', 'C']);
    expect(result.isSynced).toBe(true);
    expect(result.missingInExample).toEqual([]);
    expect(result.missingInLocal).toEqual([]);
  });

  it('should detect keys missing in example', () => {
    const result = detectDrift(['A', 'B', 'C'], ['A', 'B']);
    expect(result.isSynced).toBe(false);
    expect(result.missingInExample).toEqual(['C']);
    expect(result.missingInLocal).toEqual([]);
  });

  it('should detect keys missing in local', () => {
    const result = detectDrift(['A', 'B'], ['A', 'B', 'C']);
    expect(result.isSynced).toBe(false);
    expect(result.missingInExample).toEqual([]);
    expect(result.missingInLocal).toEqual(['C']);
  });

  it('should detect keys missing in both directions', () => {
    const result = detectDrift(['A', 'B'], ['B', 'C']);
    expect(result.isSynced).toBe(false);
    expect(result.missingInExample).toEqual(['A']);
    expect(result.missingInLocal).toEqual(['C']);
  });

  it('should handle empty arrays', () => {
    const result = detectDrift([], []);
    expect(result.isSynced).toBe(true);
  });
});

describe('isSensitiveKey', () => {
  it('should detect password keys', () => {
    expect(isSensitiveKey('DB_PASSWORD')).toBe(true);
    expect(isSensitiveKey('USER_PASS')).toBe(true);
    expect(isSensitiveKey('ADMIN_PWD')).toBe(true);
  });

  it('should detect secret keys', () => {
    expect(isSensitiveKey('JWT_SECRET')).toBe(true);
    expect(isSensitiveKey('APP_SECRET_KEY')).toBe(true);
  });

  it('should detect API keys', () => {
    expect(isSensitiveKey('API_KEY')).toBe(true);
    expect(isSensitiveKey('STRIPE_API_KEY')).toBe(true);
  });

  it('should detect token keys', () => {
    expect(isSensitiveKey('AUTH_TOKEN')).toBe(true);
    expect(isSensitiveKey('ACCESS_TOKEN')).toBe(true);
    expect(isSensitiveKey('REFRESH_TOKEN')).toBe(true);
  });

  it('should detect database keys', () => {
    expect(isSensitiveKey('DATABASE_URL')).toBe(true);
    expect(isSensitiveKey('REDIS_URL')).toBe(true);
    expect(isSensitiveKey('MONGODB_URI')).toBe(true);
  });

  it('should NOT flag non-sensitive keys', () => {
    expect(isSensitiveKey('NODE_ENV')).toBe(false);
    expect(isSensitiveKey('DEBUG')).toBe(false);
    expect(isSensitiveKey('LOG_LEVEL')).toBe(false);
    expect(isSensitiveKey('FEATURE_FLAG')).toBe(false);
  });

  it('should support custom keywords', () => {
    expect(isSensitiveKey('CUSTOM_THING', ['custom'])).toBe(true);
    expect(isSensitiveKey('MY_SPECIAL_VAR', ['special'])).toBe(true);
  });
});

describe('detectProviderSecret', () => {
  describe('AWS', () => {
    it('should detect AWS Access Key ID', () => {
      expect(detectProviderSecret('AKIAIOSFODNN7EXAMPLE')).toBe('AWS Access Key ID');
    });
  });

  describe('Stripe', () => {
    it('should detect Stripe Secret Key', () => {
      expect(detectProviderSecret('sk_live_51HG2abcdefghij1234567890')).toBe('Stripe Secret Key');
      expect(detectProviderSecret('sk_test_abcdefghij1234567890abcd')).toBe('Stripe Secret Key');
    });

    it('should detect Stripe Publishable Key', () => {
      expect(detectProviderSecret('pk_live_abcdefghij1234567890abcd')).toBe('Stripe Publishable Key');
    });

    it('should detect Stripe Webhook Secret', () => {
      expect(detectProviderSecret('whsec_abcdefghij1234567890abcd')).toBe('Stripe Webhook Secret');
    });
  });

  describe('GitHub', () => {
    it('should detect GitHub PAT (Classic)', () => {
      expect(detectProviderSecret('ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')).toBe('GitHub Personal Access Token (Classic)');
    });

    it('should detect GitHub Fine-grained PAT', () => {
      expect(detectProviderSecret('github_pat_11AAAAAA_xxxxxxxxxxxx')).toBe('GitHub Fine-grained PAT');
    });

    it('should detect GitHub App tokens', () => {
      expect(detectProviderSecret('gho_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')).toBe('GitHub OAuth Access Token');
      expect(detectProviderSecret('ghu_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')).toBe('GitHub App Token');
      expect(detectProviderSecret('ghs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')).toBe('GitHub App Installation Token');
    });
  });

  describe('Database URLs', () => {
    it('should detect PostgreSQL connection strings', () => {
      expect(detectProviderSecret('postgres://user:pass@host:5432/db')).toBe('PostgreSQL Connection String');
      expect(detectProviderSecret('postgresql://user:pass@host/db')).toBe('PostgreSQL Connection String');
    });

    it('should detect MongoDB connection strings', () => {
      expect(detectProviderSecret('mongodb://user:pass@host:27017/db')).toBe('MongoDB Connection String');
      expect(detectProviderSecret('mongodb+srv://user:pass@cluster.mongodb.net/db')).toBe('MongoDB Connection String');
    });

    it('should detect Redis connection strings', () => {
      expect(detectProviderSecret('redis://user:pass@host:6379')).toBe('Redis Connection String');
      expect(detectProviderSecret('rediss://user:pass@host:6379')).toBe('Redis Connection String');
    });

    it('should detect MySQL connection strings', () => {
      expect(detectProviderSecret('mysql://user:pass@host:3306/db')).toBe('MySQL Connection String');
    });
  });

  describe('JWT', () => {
    it('should detect JWT tokens', () => {
      expect(detectProviderSecret('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U')).toBe('JWT Token');
    });
  });

  describe('Other providers', () => {
    it('should detect Google API keys', () => {
      expect(detectProviderSecret('AIzaSyDaGmWKa4JsXZ-HjGw7ISLn_3namBGewQe')).toBe('Google API Key');
    });

    it('should detect Slack tokens', () => {
      expect(detectProviderSecret('xoxb-123456789012-123456789012-abcdefghij')).toBe('Slack Token');
    });

    it('should detect SendGrid API keys', () => {
      // Pattern: SG.[22 chars].[43 chars]
      expect(detectProviderSecret('SG.abcdefghijklmnopqrstuv.abcdefghijklmnopqrstuvwxyz1234567890abcdefg')).toBe('SendGrid API Key');
    });

    it('should detect NPM tokens', () => {
      // Pattern: npm_[36 alphanumeric chars]
      expect(detectProviderSecret('npm_abcdefghijklmnopqrstuvwxyz123456ABCD')).toBe('NPM Token');
    });
  });

  it('should return null for non-matching values', () => {
    expect(detectProviderSecret('hello world')).toBe(null);
    expect(detectProviderSecret('12345')).toBe(null);
    expect(detectProviderSecret('production')).toBe(null);
  });
});

describe('scrubValueDetailed', () => {
  it('should scrub sensitive keys', () => {
    const result = scrubValueDetailed('API_KEY', 'secret123');
    expect(result.wasScrubbed).toBe(true);
    expect(result.scrubbedValue).toBe('YOUR_API_KEY_HERE');
    expect(result.reason).toBe('Sensitive key name');
  });

  it('should NOT scrub non-sensitive keys', () => {
    const result = scrubValueDetailed('NODE_ENV', 'production');
    expect(result.wasScrubbed).toBe(false);
    expect(result.scrubbedValue).toBe('production');
    expect(result.reason).toBe('Non-sensitive key');
  });

  it('should scrub provider secrets even with non-sensitive key name', () => {
    const result = scrubValueDetailed('MY_INNOCENT_VAR', 'sk_live_abcdefghij1234567890abcd');
    expect(result.wasScrubbed).toBe(true);
    expect(result.reason).toContain('Detected Stripe');
  });

  it('should scrub everything in strict mode', () => {
    const result = scrubValueDetailed('NODE_ENV', 'production', { strictMode: true });
    expect(result.wasScrubbed).toBe(true);
    expect(result.scrubbedValue).toBe('YOUR_NODE_ENV_HERE');
    expect(result.reason).toBe('Strict mode enabled');
  });

  it('should respect ignore list', () => {
    const result = scrubValueDetailed('API_KEY', 'secret123', { ignore: ['API_KEY'] });
    expect(result.wasScrubbed).toBe(false);
    expect(result.scrubbedValue).toBe('secret123');
    expect(result.reason).toBe('Ignored (in ignore list)');
  });

  it('should respect alwaysScrub list', () => {
    const result = scrubValueDetailed('NODE_ENV', 'production', { alwaysScrub: ['NODE_ENV'] });
    expect(result.wasScrubbed).toBe(true);
    expect(result.scrubbedValue).toBe('YOUR_NODE_ENV_HERE');
    expect(result.reason).toBe('Always scrub (in alwaysScrub list)');
  });

  it('should use custom placeholder format', () => {
    const result = scrubValueDetailed('API_KEY', 'secret', { placeholderFormat: '<{KEY}>' });
    expect(result.scrubbedValue).toBe('<API_KEY>');
  });

  it('should use placeholder for empty values', () => {
    const result = scrubValueDetailed('EMPTY', '');
    expect(result.scrubbedValue).toBe('YOUR_EMPTY_HERE');
    expect(result.wasScrubbed).toBe(false);
  });
});

describe('scrubValue (simple)', () => {
  it('should return scrubbed value', () => {
    expect(scrubValue('API_KEY', 'secret')).toBe('YOUR_API_KEY_HERE');
  });

  it('should keep non-sensitive values', () => {
    expect(scrubValue('DEBUG', 'true')).toBe('true');
  });
});

describe('generateSyncedExample', () => {
  it('should generate synced content', () => {
    const envEntries = [
      { key: 'API_KEY', value: 'secret123', line: 1 },
      { key: 'DEBUG', value: 'true', line: 2 },
    ];
    const { content, entries, added } = generateSyncedExample(envEntries, []);
    
    expect(content).toContain(ENVDRIFT_SIGNATURE);
    expect(content).toContain('API_KEY=YOUR_API_KEY_HERE');
    expect(content).toContain('DEBUG=true');
    expect(entries).toHaveLength(2);
    expect(added).toEqual(['API_KEY', 'DEBUG']);
  });

  it('should preserve existing example entries in merge mode', () => {
    const envEntries = [
      { key: 'NEW_KEY', value: 'new', line: 1 },
    ];
    const existingEntries = [
      { key: 'EXISTING_KEY', value: 'existing', line: 1 },
    ];
    
    const { content, added, removed } = generateSyncedExample(envEntries, existingEntries, { merge: true });
    
    expect(content).toContain('EXISTING_KEY');
    expect(content).toContain('NEW_KEY');
    expect(added).toEqual(['NEW_KEY']);
    expect(removed).toEqual([]);
  });

  it('should sort keys when sort option is true', () => {
    const envEntries = [
      { key: 'ZEBRA', value: 'z', line: 1 },
      { key: 'ALPHA', value: 'a', line: 2 },
      { key: 'BETA', value: 'b', line: 3 },
    ];
    
    const { content } = generateSyncedExample(envEntries, [], { sort: true });
    
    const alphaIndex = content.indexOf('ALPHA');
    const betaIndex = content.indexOf('BETA');
    const zebraIndex = content.indexOf('ZEBRA');
    
    expect(alphaIndex).toBeLessThan(betaIndex);
    expect(betaIndex).toBeLessThan(zebraIndex);
  });

  it('should scrub all values in strict mode', () => {
    const envEntries = [
      { key: 'NODE_ENV', value: 'production', line: 1 },
      { key: 'DEBUG', value: 'true', line: 2 },
    ];
    
    const { entries } = generateSyncedExample(envEntries, [], { strictMode: true });
    
    expect(entries.every(e => e.wasScrubbed)).toBe(true);
  });

  it('should preserve comments when option is enabled', () => {
    const envEntries = [
      { 
        key: 'API_KEY', 
        value: 'secret', 
        line: 1,
        precedingComments: ['# API configuration'],
        comment: '# Important!'
      },
    ];
    
    const { content } = generateSyncedExample(envEntries, [], { preserveComments: true });
    
    expect(content).toContain('# API configuration');
  });

  it('should respect ignore list', () => {
    const envEntries = [
      { key: 'API_KEY', value: 'secret', line: 1 },
      { key: 'NODE_ENV', value: 'production', line: 2 },
    ];
    
    const { entries } = generateSyncedExample(envEntries, [], { ignore: ['API_KEY'] });
    
    const apiKeyEntry = entries.find(e => e.key === 'API_KEY');
    expect(apiKeyEntry?.wasScrubbed).toBe(false);
    expect(apiKeyEntry?.scrubbedValue).toBe('secret');
  });
});

describe('PROVIDER_PATTERNS', () => {
  it('should have unique pattern names', () => {
    const names = PROVIDER_PATTERNS.map(p => p.name);
    const uniqueNames = [...new Set(names)];
    expect(names.length).toBe(uniqueNames.length);
  });

  it('should have valid regex patterns', () => {
    PROVIDER_PATTERNS.forEach(({ name, pattern }) => {
      expect(() => new RegExp(pattern)).not.toThrow();
    });
  });
});
