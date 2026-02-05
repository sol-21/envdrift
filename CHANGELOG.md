# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0] - 2026-02-05

### Added
- **Interactive Init Wizard** - `envdrift init` now walks you through configuration with an interactive questionnaire
- **Custom Secret Patterns** - Define your own regex patterns in `.envdriftrc.json` to detect custom secrets
- **Programmatic API** - Full documentation for using EnvDrift as a library in Node.js projects
- **`--yes` flag for init** - Skip the wizard and use defaults with `envdrift init --yes`

### Changed
- Version is now dynamically read from `package.json` instead of being hardcoded
- Upgraded vitest to v4.x

### Fixed
- Version display now correctly shows package version

## [1.1.0] - 2026-02-05

### Changed
- Removed UI components, converted to CLI-only package
- Cleaner project structure

## [1.0.0] - 2026-01-28

### Added
- Initial release
- Smart secret detection by key name and value patterns
- Support for 30+ providers (AWS, Stripe, GitHub, OpenAI, etc.)
- `check` command - Detect drift between .env and .env.example
- `sync` command - Sync and scrub .env.example
- `diff` command - Visual comparison between files
- `scan` command - Find all .env files in project
- `init` command - Initialize EnvDrift configuration
- Watch mode for auto-sync
- Interactive mode for manual approval
- Strict mode for maximum security
- JSON output for CI/CD tooling
- Git pre-commit hook support
- Configuration file support (.envdriftrc.json)
