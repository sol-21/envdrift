# 🛡️ EnvDrift

> Sync `.env` files without leaking secrets.

[![npm version](https://img.shields.io/npm/v/envdrift.svg)](https://www.npmjs.com/package/envdrift)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

EnvDrift is a CLI tool that automatically syncs your `.env` file to `.env.example` while intelligently scrubbing sensitive values. It detects secrets from 30+ providers including AWS, Stripe, GitHub, OpenAI, and database connection strings.

## ✨ Features

- **🔍 Smart Detection** - Automatically identifies sensitive values by key name AND value patterns
- **🏢 Provider Detection** - Recognizes secrets from AWS, Stripe, GitHub, PostgreSQL, MongoDB, OpenAI, and 30+ more
- **🎯 Strict Mode** - Scrub ALL values when you want maximum security
- **👀 Dry Run** - Preview exactly what will change before modifying files
- **⚙️ Config File** - Project-level `.envdriftrc.json` for team consistency
- **🔒 Ignore List** - Keep certain keys unmodified
- **🔀 Merge Mode** - Add new keys without overwriting existing entries
- **💬 Comment Preservation** - Keeps your documentation intact
- **🚀 CI/CD Ready** - Proper exit codes and minimal output mode

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
```

## 📖 Commands

### `envdrift check`

Detect drift between your `.env` and `.env.example` files.

```bash
envdrift check
envdrift check --input .env.local --output .env.local.example
envdrift check --ci  # CI mode with proper exit codes
```

**Options:**
| Option | Description |
|--------|-------------|
| `-i, --input <file>` | Input file (default: `.env`) |
| `-o, --output <file>` | Output file (default: `.env.example`) |
| `--ci` | CI mode - minimal output, exit code 1 on drift |

### `envdrift sync`

Sync and scrub your `.env.example` file.

```bash
envdrift sync
envdrift sync --dry-run
envdrift sync --strict
envdrift sync --input .env.local --output .env.local.example
envdrift sync --ignore NODE_ENV DEBUG
envdrift sync --merge --sort
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

### `envdrift init`

Initialize EnvDrift in your project.

```bash
envdrift init           # Create .envdriftrc.json
envdrift init --hook    # Also setup git pre-commit hook
envdrift init --force   # Overwrite existing config
```

## ⚙️ Configuration

Create a `.envdriftrc.json` in your project root:

```json
{
  "input": ".env",
  "output": ".env.example",
  "strict": false,
  "ignore": ["NODE_ENV", "DEBUG", "LOG_LEVEL"],
  "alwaysScrub": ["INTERNAL_SECRET"],
  "sensitiveKeywords": ["custom", "mycompany"],
  "preserveComments": true,
  "merge": false,
  "sort": false
}
```

**Config Options:**
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `input` | string | `.env` | Source file path |
| `output` | string | `.env.example` | Destination file path |
| `strict` | boolean | `false` | Scrub all values |
| `ignore` | string[] | `[]` | Keys to never scrub |
| `alwaysScrub` | string[] | `[]` | Keys to always scrub |
| `sensitiveKeywords` | string[] | `[]` | Custom sensitive keywords |
| `preserveComments` | boolean | `true` | Preserve comments |
| `merge` | boolean | `false` | Merge mode |
| `sort` | boolean | `false` | Sort keys alphabetically |
| `placeholderFormat` | string | `YOUR_{KEY}_HERE` | Custom placeholder |

## 🔐 Provider Detection

EnvDrift automatically detects and scrubs secrets from these providers by analyzing the **value pattern**, even if the key name doesn't indicate sensitivity:

| Provider | Pattern Examples |
|----------|------------------|
| **AWS** | `AKIA...`, 40-char secret keys |
| **Stripe** | `sk_live_...`, `pk_test_...`, `whsec_...` |
| **GitHub** | `ghp_...`, `github_pat_...`, `gho_...` |
| **GitLab** | `glpat-...`, `glptt-...` |
| **OpenAI** | `sk-...` (48 chars) |
| **Anthropic** | `sk-ant-...` |
| **Database URLs** | `postgres://`, `mongodb://`, `redis://` |
| **JWT** | `eyJ...` (3 parts) |
| **Slack** | `xoxb-...`, `xoxa-...` |
| **SendGrid** | `SG....` |
| **Twilio** | `AC...` (32 chars) |
| **Google** | `AIza...` |
| **NPM** | `npm_...` |
| **Vercel/Netlify** | Various patterns |
| **PEM Keys** | `-----BEGIN PRIVATE KEY-----` |

## 🤖 CI/CD Integration

### GitHub Actions

```yaml
name: Check Env Drift

on: [push, pull_request]

jobs:
  check-env:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Check for env drift
        run: npx envdrift check --ci
```

### Pre-commit Hook

```bash
# Setup automatically
envdrift init --hook

# Or manually add to .git/hooks/pre-commit:
#!/bin/sh
npx envdrift check --ci || exit 1
```

### GitLab CI

```yaml
check-env:
  script:
    - npx envdrift check --ci
  rules:
    - changes:
        - .env
        - .env.example
```

## 📝 Example Output

**Input (`.env`):**
```env
# Database
DATABASE_URL=postgres://user:secretpass@db.example.com:5432/myapp

# API Keys
STRIPE_KEY=sk_live_51HG2abcdefghij1234567890
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# App Config
NODE_ENV=production
DEBUG=false
```

**Output (`.env.example`):**
```env
# This file was synced and scrubbed by EnvDrift
# https://github.com/sol-21/envdrift

# Database
DATABASE_URL=YOUR_DATABASE_URL_HERE

# API Keys
STRIPE_KEY=YOUR_STRIPE_KEY_HERE
GITHUB_TOKEN=YOUR_GITHUB_TOKEN_HERE

# App Config
NODE_ENV=production
DEBUG=false
```

## 🧪 Programmatic Usage

```typescript
import {
  parseEnvContent,
  detectDrift,
  generateSyncedExample,
  detectProviderSecret,
} from 'envdrift';

// Parse env content
const entries = parseEnvContent(envFileContent);

// Check for drift
const drift = detectDrift(envKeys, exampleKeys);
if (!drift.isSynced) {
  console.log('Missing keys:', drift.missingInExample);
}

// Generate synced content
const { content, entries } = generateSyncedExample(envEntries, exampleEntries, {
  strictMode: false,
  ignore: ['NODE_ENV'],
});

// Detect provider secrets
const provider = detectProviderSecret('sk_live_xxx');
// Returns: "Stripe Secret Key"
```

## 🛡️ Security

EnvDrift is designed with security as the top priority:

1. **Never exposes real values** - All sensitive values are replaced with placeholders
2. **Pattern matching** - Detects secrets even when key names are misleading
3. **Strict mode** - Option to scrub everything when in doubt
4. **Dry run** - Always preview before making changes
5. **No network calls** - Everything runs locally, your secrets never leave your machine

## 📄 License

MIT © [sol-21](https://github.com/sol-21)

---

<p align="center">
  Built with 🛡️ for developers who care about security
</p>
