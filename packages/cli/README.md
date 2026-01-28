# EnvDrift CLI

> **Sync your `.env` files safely—never leak secrets.**

## Installation

```bash
npm install -g envdrift
```

Or use directly with npx:

```bash
npx envdrift check
```

## Commands

### `envdrift check`

Detect drift between `.env` and `.env.example`:

```bash
envdrift check
```

Returns exit code `1` if drift is detected (useful for CI/CD pipelines).

### `envdrift sync`

Sync `.env.example` with keys from `.env`, automatically scrubbing sensitive values:

```bash
envdrift sync
```

## Smart Scrubbing

EnvDrift automatically detects sensitive keys (containing words like `password`, `secret`, `token`, `api`, `key`, etc.) and replaces their values with safe placeholders like `YOUR_API_KEY_HERE`.

## Example

```bash
# Check for drift
$ envdrift check

╔═══════════════════════════════════════╗
║  🛡️  EnvDrift  v1.0.0               ║
║  Sync .env files without leaking     ║
║  secrets.                            ║
╚═══════════════════════════════════════╝

✗ DRIFT DETECTED

⚠ Missing in .env.example (2):
  - NEW_API_KEY
  - DATABASE_URL

────────────────────────────────────────
Run envdrift sync to fix drift
```

## License

MIT
