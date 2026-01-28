import React from 'react';
import { Terminal, Shield, Zap, Copy, Check, Github, Package, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

// Terminal output examples from actual CLI runs
const EXAMPLES = {
  check: `╔═══════════════════════════════════════╗
║  🛡️  EnvDrift  v1.0.0               ║
║  Sync .env files without leaking     ║
║  secrets.                            ║
╚═══════════════════════════════════════╝

✗ DRIFT DETECTED

⚠ Missing in .env.example (3):
  - DATABASE_URL
  - STRIPE_KEY
  - GITHUB_TOKEN

────────────────────────────────────────
Run envdrift sync to fix drift`,

  syncDryRun: `╔═══════════════════════════════════════╗
║  🛡️  EnvDrift  v1.0.0               ║
║  Sync .env files without leaking     ║
║  secrets.                            ║
╚═══════════════════════════════════════╝

ℹ DRY RUN - No files will be modified
► Syncing .env.example...

► DRY RUN - Preview of changes:

┌──────────────────────┬───────────────────────────────────┬─────────────────────────┐
│ KEY                  │ SCRUBBED VALUE                    │ REASON                  │
├──────────────────────┼───────────────────────────────────┼─────────────────────────┤
│ DATABASE_URL         │ YOUR_DATABASE_URL_HERE            │⚠Detected PostgreSQL    │
│ STRIPE_KEY           │ YOUR_STRIPE_KEY_HERE              │⚠Detected Stripe Secret │
│ GITHUB_TOKEN         │ YOUR_GITHUB_TOKEN_HERE            │⚠Detected GitHub PAT    │
│ MY_INNOCENT_VAR      │ YOUR_MY_INNOCENT_VAR_HERE         │⚠Detected Stripe Secret │
│ PORT                 │ YOUR_PORT_HERE                    │⚠Sensitive key name     │
│ NODE_ENV             │ production                        │✓Non-sensitive key      │
└──────────────────────┴───────────────────────────────────┴─────────────────────────┘

────────────────────────────────────────
⚠ 5 value(s) would be scrubbed, 1 kept as-is

ℹ Run without --dry-run to apply changes`,

  syncStrict: `╔═══════════════════════════════════════╗
║  🛡️  EnvDrift  v1.0.0               ║
║  Sync .env files without leaking     ║
║  secrets.                            ║
╚═══════════════════════════════════════╝

⚠ STRICT MODE - All values will be scrubbed
► Syncing .env.example...

✓ .env.example updated!

  Added 6 new key(s):
    + DATABASE_URL
    + STRIPE_KEY
    + GITHUB_TOKEN
    + MY_INNOCENT_VAR
    + PORT
    + NODE_ENV

────────────────────────────────────────
✓ 6 sensitive value(s) scrubbed
  Output: /your/project/.env.example`,

  sync: `╔═══════════════════════════════════════╗
║  🛡️  EnvDrift  v1.0.0               ║
║  Sync .env files without leaking     ║
║  secrets.                            ║
╚═══════════════════════════════════════╝

► Syncing .env.example...

✓ .env.example updated!

  Added 6 new key(s):
    + DATABASE_URL
    + STRIPE_KEY
    + GITHUB_TOKEN
    + MY_INNOCENT_VAR
    + PORT
    + NODE_ENV

────────────────────────────────────────
✓ 4 sensitive value(s) scrubbed
  Output: /your/project/.env.example`,

  envExample: `# This file was synced and scrubbed by EnvDrift (https://github.com/sol-21/envdrift)

DATABASE_URL=YOUR_DATABASE_URL_HERE
STRIPE_KEY=YOUR_STRIPE_KEY_HERE
GITHUB_TOKEN=YOUR_GITHUB_TOKEN_HERE
MY_INNOCENT_VAR=YOUR_MY_INNOCENT_VAR_HERE
PORT=YOUR_PORT_HERE
NODE_ENV=production`,
};

const TerminalBlock: React.FC<{ 
  command: string; 
  output: string; 
  title?: string;
}> = ({ command, output, title }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {title && (
        <div className="px-4 py-2 bg-muted/50 border-b border-border flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 text-xs"
          >
            {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
      )}
      <div className="p-4 bg-[#0d1117]">
        <div className="flex items-center gap-2 mb-3 text-muted-foreground">
          <span className="text-green-400">$</span>
          <code className="text-green-400 font-mono text-sm">{command}</code>
        </div>
        <pre className="font-mono text-xs text-gray-300 whitespace-pre overflow-x-auto">
          {output}
        </pre>
      </div>
    </div>
  );
};

const FeatureCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
}> = ({ icon, title, description }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="p-6 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors"
  >
    <div className="flex items-center gap-3 mb-3">
      <div className="p-2 rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="font-display font-semibold text-foreground">{title}</h3>
    </div>
    <p className="text-sm text-muted-foreground">{description}</p>
  </motion.div>
);

const Index = () => {
  const [copiedInstall, setCopiedInstall] = useState(false);

  const handleCopyInstall = async () => {
    await navigator.clipboard.writeText('npx envdrift sync');
    setCopiedInstall(true);
    setTimeout(() => setCopiedInstall(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative px-6 py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-3 mb-6"
          >
            <Terminal className="w-12 h-12 text-primary" />
            <h1 className="font-display text-5xl md:text-6xl font-bold text-foreground">
              EnvDrift
            </h1>
          </motion.div>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto"
          >
            Sync your <code className="text-primary font-mono">.env</code> files safely—never leak secrets.
            A CLI tool that detects drift and smart-scrubs sensitive values.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button
              size="lg"
              onClick={handleCopyInstall}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-mono"
            >
              {copiedInstall ? <Check className="w-4 h-4 mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
              npx envdrift sync
            </Button>
            <Button
              variant="outline"
              size="lg"
              asChild
            >
              <a href="https://github.com/sol-21/envdrift" target="_blank" rel="noopener noreferrer">
                <Github className="w-4 h-4 mr-2" />
                View on GitHub
              </a>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Quick Start */}
      <section className="px-6 py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="font-display text-3xl font-bold text-center mb-12"
          >
            Quick Start
          </motion.h2>

          <div className="grid gap-6">
            <TerminalBlock
              title="1. Check for drift"
              command="npx envdrift check"
              output={EXAMPLES.check}
            />
            <TerminalBlock
              title="2. Preview changes (dry run)"
              command="npx envdrift sync --dry-run"
              output={EXAMPLES.syncDryRun}
            />
            <TerminalBlock
              title="3. Sync and scrub"
              command="npx envdrift sync"
              output={EXAMPLES.sync}
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="font-display text-3xl font-bold text-center mb-12"
          >
            Features
          </motion.h2>

          <div className="grid md:grid-cols-2 gap-6">
            <FeatureCard
              icon={<Shield className="w-5 h-5" />}
              title="Smart Scrubbing"
              description="Automatically detects and scrubs sensitive values (passwords, API keys, tokens) based on key names and value patterns."
            />
            <FeatureCard
              icon={<Zap className="w-5 h-5" />}
              title="Provider Detection"
              description="Recognizes secrets from AWS, Stripe, GitHub, PostgreSQL, MongoDB, and more—even if the key name is misleading."
            />
            <FeatureCard
              icon={<Terminal className="w-5 h-5" />}
              title="Strict Mode"
              description="Use --strict to scrub ALL values regardless of key name. Maximum security for paranoid developers."
            />
            <FeatureCard
              icon={<BookOpen className="w-5 h-5" />}
              title="Dry Run Preview"
              description="Use --dry-run to see exactly what would be written before making any changes. Full transparency."
            />
          </div>
        </div>
      </section>

      {/* Strict Mode Example */}
      <section className="px-6 py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="font-display text-3xl font-bold text-center mb-4"
          >
            Strict Mode
          </motion.h2>
          <p className="text-center text-muted-foreground mb-12">
            For maximum security, use <code className="text-primary font-mono">--strict</code> to scrub every value.
          </p>

          <TerminalBlock
            command="npx envdrift sync --strict"
            output={EXAMPLES.syncStrict}
          />
        </div>
      </section>

      {/* Output Example */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="font-display text-3xl font-bold text-center mb-4"
          >
            Generated Output
          </motion.h2>
          <p className="text-center text-muted-foreground mb-12">
            Your <code className="text-primary font-mono">.env.example</code> will be clean and safe to commit.
          </p>

          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-2 bg-muted/50 border-b border-border flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="ml-2 text-sm font-mono text-muted-foreground">.env.example</span>
            </div>
            <pre className="p-4 font-mono text-sm text-foreground bg-[#0d1117] overflow-x-auto">
              {EXAMPLES.envExample}
            </pre>
          </div>
        </div>
      </section>

      {/* Installation */}
      <section className="px-6 py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="font-display text-3xl font-bold mb-4"
          >
            Installation
          </motion.h2>
          <p className="text-muted-foreground mb-8">
            Use directly with npx or install globally
          </p>

          <div className="grid md:grid-cols-2 gap-6 text-left">
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Quick Use (npx)
              </h3>
              <code className="block p-3 rounded bg-[#0d1117] font-mono text-sm text-green-400">
                npx envdrift sync
              </code>
            </div>
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                Global Install
              </h3>
              <code className="block p-3 rounded bg-[#0d1117] font-mono text-sm text-green-400">
                npm install -g envdrift
              </code>
            </div>
          </div>
        </div>
      </section>

      {/* CLI Reference */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="font-display text-3xl font-bold text-center mb-12"
          >
            CLI Reference
          </motion.h2>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 font-display font-semibold">Command</th>
                  <th className="text-left p-4 font-display font-semibold">Description</th>
                </tr>
              </thead>
              <tbody className="font-mono text-sm">
                <tr className="border-b border-border">
                  <td className="p-4 text-primary">envdrift check</td>
                  <td className="p-4 text-muted-foreground">Detect drift between .env and .env.example</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="p-4 text-primary">envdrift sync</td>
                  <td className="p-4 text-muted-foreground">Sync and scrub .env.example</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="p-4 text-primary">envdrift sync --dry-run</td>
                  <td className="p-4 text-muted-foreground">Preview changes without modifying files</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="p-4 text-primary">envdrift sync --strict</td>
                  <td className="p-4 text-muted-foreground">Scrub ALL values (paranoid mode)</td>
                </tr>
                <tr>
                  <td className="p-4 text-primary">envdrift --help</td>
                  <td className="p-4 text-muted-foreground">Show help information</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 border-t border-border">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Terminal className="w-5 h-5 text-primary" />
            <span className="font-display font-bold text-lg">EnvDrift</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Built with <span className="text-primary">♥</span> for developers who care about security
          </p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="https://github.com/sol-21/envdrift"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
            <a
              href="https://www.npmjs.com/package/envdrift"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Package className="w-5 h-5" />
            </a>
          </div>
          <p className="text-xs text-muted-foreground mt-6">
            MIT License © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
