# 🛡️ EnvDrift

> Sync `.env` files without leaking secrets.

[![npm version](https://img.shields.io/npm/v/envdrift.svg)](https://www.npmjs.com/package/envdrift)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-96%20passed-brightgreen.svg)](https://github.com/sol-21/envdrift)

EnvDrift is a CLI tool that automatically syncs your `.env` file to `.env.example` while intelligently scrubbing sensitive values. It detects secrets from 30+ providers including AWS, Stripe, GitHub, OpenAI, and database connection strings.

## ✨ Features

- **🔍 Smart Detection** - Identifies sensitive values by key name AND value patterns
- **🏢 Provider Detection** - Recognizes secrets from AWS, Stripe, GitHub, PostgreSQL, MongoDB, OpenAI, and 30+ more
- **📊 JSON Output** - Machine-readable output for CI/CD tooling
- **🔇 Quiet Mode** - Suppress all output except errors
- **📁 Multi-file Support** - Scan `.env`, `.env.local`, `.env.development`, etc.
- **🔄 Diff Command** - Visual comparison between files
- **👁️ Watch Mode** - Auto-sync on file changes
- **🎛️ Interactive Mode** - Approve each change individually
- **🎯 Strict Mode** - Scrub ALL values for maximum security
- **👀 Dry Run** - Preview changes before modifying files
- **⚙️ Config File** - Project-level `.envdriftrc.json` for team consistency
- **🔒 Ignore List** - Keep certain keys unmodified
- **🔀 Merge Mode** - Add new keys without overwriting existing entries
- **💬 Comment Preservation** - Keeps your documentation intact
- **🚀 CI/CD Ready** - Proper exit codes and minimal output mode
- **🪝 Git Hooks** - Pre-commit hook to prevent drift

## 📦 Installation

```bash
# Use directly with npx (no install needed)
npx envdrift sync

# Or install globally
npm install -g envdrift

# Or add to your project
npm install --save-dev envdrift
```

## 🚀 Quick Start

```bash
# Check for drift between .env and .env.example
npx envdrift check

# Sync .env.example with smart scrubbing
npx envdrift sync

# Preview changes without modifying files
npx envdrift sync --dry-run

# Scrub ALL values (paranoid mode)
npx envdrift sync --strict

# Interactive sync - approve each change
npx envdrift sync --interactive

# Watch for changes and auto-sync
npx envdrift sync --watch
```

## 📖 Commands

### `envdrift check`

Detect drift between your `.env` and `.env.example` files.

```bash
envdrift check
envdrift check --input .env.local --output .env.local.example
envdrift check --ci        # CI mode with proper exit codes
envdrift check --json      # JSON output for tooling
envdrift check --quiet     # Minimal output
envdrift check --all       # Check all .env files
```

**Options:**
| Option | Description |
|--------|-------------|
| `-i, --input <file>` | Input file (default: `.env`) |
| `-o, --output <file>` | Output file (default: `.env.example`) |
| `--ci` | CI mode - minimal output, exit code 1 on drift |
| `--json` | Output results as JSON |
| `-q, --quiet` | Suppress all output except errors |
| `-a, --all` | Check all .env files (.env, .env.local, etc.) |

### `envdrift sync`

Sync and scrub your `.env.example` file.

```bash
envdrift sync
envdrift sync --dry-run           # Preview changes
envdrift sync --strict            # Scrub all values
envdrift sync --interactive       # Approve each change
envdrift sync --watch             # Auto-sync on changes
envdrift sync --json              # JSON output
envdrift sync --merge --sort      # Merge and sort keys
envdrift sync --ignore NODE_ENV DEBUG
```

**Options:**
| Option | Description |
|--------|-------------|
| `-i, --input <file>` | Input file (default: `.env`) |
| `-o, --output <file>` | Output file (default: `.env.example`) |
| `-d, --dry-run` | Preview changes without modifying files |
| `-s, --strict` | Scrub ALL values regardless of key name |
| `--ci` | CI mode - minimal output |
| `-m, --merge` | Add new keys without removing existing |
| `--sort` | Sort keys alphabetically |
| `--ignore <keys...>` | Keys to never scrub |
| `--no-preserve-comments` | Don't preserve comments |
| `--json` | Output results as JSON |
| `-q, --quiet` | Suppress all output except errors |
| `-I, --interactive` | Interactive mode - approve each change |
| `-w, --watch` | Watch mode - auto-sync on file changes |

### `envdrift diff`

Show visual diff between `.env` and `.env.example`.

```bash
envdrift diff
envdrift diff --changes-only    # Only show differences
envdrift diff --json            # JSON output
```

**Options:**
| Option | Description |
|--------|-------------|
| `-i, --input <file>` | Input file (default: `.env`) |
| `-o, --output <file>` | Output file (default: `.env.example`) |
| `--json` | Output results as JSON |
| `-q, --quiet` | Suppress all output except errors |
| `-c, --changes-only` | Only show changes, hide unchanged keys |

### `envdrift scan`

Scan project for all `.env` files.

```bash
envdrift scan
envdrift scan --json
```

**Options:**
| Option | Description |
|--------|-------------|
| `--json` | Output results as JSON |
| `-q, --quiet` | Suppress all output except errors |

### `envdrift init`

Initialize EnvDrift in your project with an interactive wizard.

```bash
envdrift init           # Interactive wizard
envdrift init --yes     # Skip wizard, use defaults
envdrift init --hook    # Also setup pre-commit hook
envdrift init --force   # Overwrite existing config
```

**Options:**
| Option | Description |
|--------|-------------|
| `-f, --force` | Overwrite existing config file |
| `--hook` | Setup git pre-commit hook |
| `-y, --yes` | Skip wizard, use default config |

## ⚙️ Configuration

Create `.envdriftrc.json` in your project root (or use `envdrift init` wizard):

```json
{
  "input": ".env",
  "output": ".env.example",
  "strict": false,
  "ignore": ["NODE_ENV", "DEBUG", "LOG_LEVEL"],
  "alwaysScrub": ["INTERNAL_API_KEY"],
  "sensitiveKeywords": ["custom_secret"],
  "customPatterns": [
    { "name": "MyService", "pattern": "^myservice_[a-z0-9]{32}$" }
  ],
  "preserveComments": true,
  "merge": false,
  "sort": false,
  "placeholderFormat": "YOUR_{KEY}_HERE"
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `input` | string | `.env` | Input file path |
| `output` | string | `.env.example` | Output file path |
| `strict` | boolean | `false` | Scrub all values |
| `ignore` | string[] | `[]` | Keys to never scrub |
| `alwaysScrub` | string[] | `[]` | Keys to always scrub |
| `sensitiveKeywords` | string[] | `[]` | Custom sensitive keywords |
| `customPatterns` | array | `[]` | Custom regex patterns for secret detection |
| `preserveComments` | boolean | `true` | Preserve comments |
| `merge` | boolean | `false` | Merge mode |
| `sort` | boolean | `false` | Sort keys alphabetically |
| `groupByPrefix` | boolean | `false` | Group keys by prefix |
| `placeholderFormat` | string | `YOUR_{KEY}_HERE` | Placeholder template |

## 🔐 Provider Detection

EnvDrift automatically detects and scrubs secrets from these providers:

| Provider | Pattern |
|----------|---------|
| **AWS** | Access Key ID (`AKIA...`), Secret Access Key |
| **Stripe** | `sk_live_*`, `sk_test_*`, `pk_*`, `rk_*`, `whsec_*` |
| **GitHub** | `ghp_*`, `gho_*`, `ghu_*`, `ghs_*`, `ghr_*`, `github_pat_*` |
| **GitLab** | `glpat-*`, `glptt-*` |
| **OpenAI** | `sk-...` (48 chars) |
| **Anthropic** | `sk-ant-*` |
| **Clerk** | `sk_live_*`, `sk_test_*`, `pk_live_*`, `pk_test_*` |
| **Supabase** | JWT tokens starting with `eyJ...` |
| **Twilio** | Account SID (`AC...`), Auth Token |
| **SendGrid** | `SG.*.*` |
| **Mailgun** | `key-*` |
| **Mailchimp** | `*-us*` API keys |
| **Slack** | `xox[baprs]-*`, webhook URLs |
| **Discord** | Webhook URLs |
| **Google** | API Keys (`AIza*`), OAuth Client IDs |
| **NPM** | `npm_*` tokens |
| **Heroku** | UUID-format API keys |
| **Databases** | PostgreSQL, MySQL, MongoDB, Redis, SQLite connection strings |
| **JWT** | `eyJ*.*.*` tokens |
| **Private Keys** | PEM format (`-----BEGIN PRIVATE KEY-----`) |

## 🚀 CI/CD Integration

### GitHub Actions

```yaml
name: EnvDrift Check

on: [push, pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npx envdrift check --ci
```

### JSON Output for Tooling

```bash
# Get drift status as JSON
npx envdrift check --json

# Get sync preview as JSON
npx envdrift sync --dry-run --json

# Get diff as JSON
npx envdrift diff --json
```

Example JSON output:

```json
{
  "synced": false,
  "missingInExample": ["NEW_API_KEY"],
  "missingInEnv": ["OLD_KEY"],
  "envKeyCount": 10,
  "exampleKeyCount": 9
}
```

### Git Pre-commit Hook

```bash
# Setup automatically
npx envdrift init --hook

# Or add manually to .git/hooks/pre-commit
npx envdrift check --ci
```

## 🎯 Example Workflows

### Daily Development

```bash
# Watch for changes and auto-sync
npx envdrift sync --watch
```

### Before Committing

```bash
# Check for drift
npx envdrift check

# If drift detected, sync
npx envdrift sync

# Or preview first
npx envdrift sync --dry-run
```

### Team Onboarding

```bash
# Initialize project with config + pre-commit hook
npx envdrift init --hook
```

### Maximum Security

```bash
# Scrub ALL values, no exceptions
npx envdrift sync --strict
```

### Interactive Review

```bash
# Approve each change individually
npx envdrift sync --interactive
```

### Multi-file Projects (Next.js, Vite)

```bash
# Scan all .env files
npx envdrift scan

# Check all .env files at once
npx envdrift check --all

# Sync specific file
npx envdrift sync -i .env.local -o .env.local.example
```

## 📚 Programmatic API

EnvDrift can be used as a library in your Node.js projects:

### Installation

```bash
npm install envdrift
```

### Basic Usage

```typescript
import {
  parseEnvContent,
  detectDrift,
  generateSyncedExample,
  detectProviderSecret,
  isSensitiveKey,
} from 'envdrift';

// Parse .env file content
const envContent = `
API_KEY=sk_live_abc123
DATABASE_URL=postgres://user:pass@localhost/db
NODE_ENV=development
`;

const entries = parseEnvContent(envContent);
console.log(entries);
// [
//   { key: 'API_KEY', value: 'sk_live_abc123', line: 2 },
//   { key: 'DATABASE_URL', value: 'postgres://user:pass@localhost/db', line: 3 },
//   { key: 'NODE_ENV', value: 'development', line: 4 }
// ]
```

### Drift Detection

```typescript
import { parseEnvContent, extractKeys, detectDrift } from 'envdrift';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const exampleContent = fs.readFileSync('.env.example', 'utf-8');

const envKeys = extractKeys(parseEnvContent(envContent));
const exampleKeys = extractKeys(parseEnvContent(exampleContent));

const drift = detectDrift(envKeys, exampleKeys);

console.log(drift);
// {
//   isSynced: false,
//   missingInExample: ['NEW_KEY'],
//   missingInLocal: ['REMOVED_KEY'],
//   envKeys: [...],
//   exampleKeys: [...]
// }
```

### Generate Synced Example

```typescript
import { parseEnvContent, generateSyncedExample } from 'envdrift';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const envEntries = parseEnvContent(envContent);

const exampleContent = fs.readFileSync('.env.example', 'utf-8');
const exampleEntries = parseEnvContent(exampleContent);

const result = generateSyncedExample(envEntries, exampleEntries, {
  strictMode: false,
  ignore: ['NODE_ENV', 'DEBUG'],
  preserveComments: true,
});

console.log(result.content);  // Scrubbed .env.example content
console.log(result.added);    // Keys added
console.log(result.removed);  // Keys removed
console.log(result.entries);  // Detailed entry info with scrub reasons

// Write to file
fs.writeFileSync('.env.example', result.content);
```

### Secret Detection

```typescript
import { detectProviderSecret, isSensitiveKey } from 'envdrift';

// Detect secrets by value pattern
detectProviderSecret('sk_live_abc123xyz');
// Returns: 'Stripe Secret Key'

detectProviderSecret('ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
// Returns: 'GitHub Personal Access Token (Classic)'

detectProviderSecret('postgres://user:pass@localhost/db');
// Returns: 'PostgreSQL Connection String'

detectProviderSecret('hello-world');
// Returns: null (not a known secret pattern)

// Check if key name is sensitive
isSensitiveKey('DATABASE_PASSWORD');  // true
isSensitiveKey('API_KEY');            // true
isSensitiveKey('APP_NAME');           // false
isSensitiveKey('MY_CUSTOM_SECRET', ['custom_secret']);  // true (with custom keywords)
```

### Custom Patterns

```typescript
import { detectProviderSecret } from 'envdrift';

// Use custom patterns
const customPatterns = [
  { name: 'MyService', pattern: '^myservice_[a-z0-9]{32}$' },
  { name: 'InternalToken', pattern: '^internal_token_[A-Z0-9]+$' },
];

detectProviderSecret('myservice_abc123def456ghi789jkl012mno345', customPatterns);
// Returns: 'Custom: MyService'
```

### API Reference

#### `parseEnvContent(content: string, preserveComments?: boolean): EnvEntry[]`
Parse .env file content into structured entries.

#### `extractKeys(entries: EnvEntry[]): string[]`
Extract just the key names from parsed entries.

#### `detectDrift(envKeys: string[], exampleKeys: string[]): DriftResult`
Compare two sets of keys and return drift information.

#### `generateSyncedExample(envEntries, exampleEntries, options?): SyncResult`
Generate scrubbed .env.example content.

#### `detectProviderSecret(value: string, customPatterns?): string | null`
Check if a value matches known secret patterns.

#### `isSensitiveKey(key: string, customKeywords?): boolean`
Check if a key name indicates sensitive data.

#### `configToSyncOptions(config: EnvDriftConfig): SyncOptions`
Convert config file format to sync options.

### Types

```typescript
interface EnvEntry {
  key: string;
  value: string;
  line: number;
  comment?: string;
  precedingComments?: string[];
}

interface DriftResult {
  isSynced: boolean;
  missingInExample: string[];
  missingInLocal: string[];
  envKeys: string[];
  exampleKeys: string[];
}

interface SyncOptions {
  strictMode?: boolean;
  ignore?: string[];
  alwaysScrub?: string[];
  customSensitiveKeywords?: string[];
  customPatterns?: { name: string; pattern: string }[];
  preserveComments?: boolean;
  merge?: boolean;
  sort?: boolean;
  placeholderFormat?: string;
}
```

## 📝 License

MIT © [sol-21](https://github.com/sol-21)
