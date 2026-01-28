import React, { useState } from 'react';
import { Terminal, Shield, Zap, Copy, Check, Github, Package, BookOpen, ChevronRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

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

  envExample: `# This file was synced and scrubbed by EnvDrift
# https://github.com/sol-21/envdrift

DATABASE_URL=YOUR_DATABASE_URL_HERE
STRIPE_KEY=YOUR_STRIPE_KEY_HERE
GITHUB_TOKEN=YOUR_GITHUB_TOKEN_HERE
MY_INNOCENT_VAR=YOUR_MY_INNOCENT_VAR_HERE
PORT=YOUR_PORT_HERE
NODE_ENV=production`,
};

// Reusable Copy Button Component
const CopyButton: React.FC<{ 
  text: string; 
  className?: string;
  variant?: 'default' | 'minimal' | 'prominent';
}> = ({ text, className = '', variant = 'default' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (variant === 'minimal') {
    return (
      <button
        onClick={handleCopy}
        className={`p-1.5 rounded hover:bg-white/10 transition-colors ${className}`}
        title="Copy to clipboard"
      >
        {copied ? (
          <Check className="w-4 h-4 text-green-400" />
        ) : (
          <Copy className="w-4 h-4 text-gray-400 hover:text-white" />
        )}
      </button>
    );
  }

  if (variant === 'prominent') {
    return (
      <button
        onClick={handleCopy}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 border border-white/20 transition-all ${className}`}
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 text-green-400" />
            <span className="text-sm text-green-400 font-medium">Copied!</span>
          </>
        ) : (
          <>
            <Copy className="w-4 h-4 text-gray-300" />
            <span className="text-sm text-gray-300 font-medium">Copy</span>
          </>
        )}
      </button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className={`h-8 px-3 text-xs bg-white/5 hover:bg-white/10 border border-white/10 ${className}`}
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 mr-1.5 text-green-400" />
          <span className="text-green-400">Copied!</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5 mr-1.5" />
          Copy
        </>
      )}
    </Button>
  );
};

// Code Block with Copy - for inline commands
const CodeBlock: React.FC<{
  code: string;
  language?: string;
  showLineNumbers?: boolean;
}> = ({ code, showLineNumbers = false }) => {
  return (
    <div className="group relative rounded-lg bg-[#0d1117] border border-[#30363d] overflow-hidden">
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <CopyButton text={code} variant="prominent" />
      </div>
      <pre className={`p-4 overflow-x-auto font-mono text-sm text-gray-300 ${showLineNumbers ? 'pl-12' : ''}`}>
        <code>{code}</code>
      </pre>
    </div>
  );
};

// Terminal Block Component for command + output
const TerminalBlock: React.FC<{ 
  command: string; 
  output: string; 
  title?: string;
  step?: number;
}> = ({ command, output, title, step }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="rounded-xl border border-[#30363d] bg-[#0d1117] overflow-hidden shadow-2xl"
    >
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#161b22] border-b border-[#30363d]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
          </div>
          {title && (
            <div className="flex items-center gap-2 ml-2">
              {step && (
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {step}
                </span>
              )}
              <span className="text-sm font-medium text-gray-400">{title}</span>
            </div>
          )}
        </div>
        <CopyButton text={command} variant="prominent" />
      </div>
      
      {/* Command Line */}
      <div className="px-4 py-3 bg-[#0d1117] border-b border-[#30363d]/50">
        <div className="flex items-center gap-2">
          <span className="text-green-400 font-mono">$</span>
          <code className="text-green-400 font-mono text-sm font-medium">{command}</code>
        </div>
      </div>
      
      {/* Output */}
      <div className="p-4 bg-[#0d1117]">
        <pre className="font-mono text-xs text-gray-300 whitespace-pre overflow-x-auto leading-relaxed">
          {output}
        </pre>
      </div>
    </motion.div>
  );
};

// Command Card for Installation section
const CommandCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  command: string;
}> = ({ icon, title, description, command }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="rounded-xl border border-border bg-card p-6 hover:border-primary/50 transition-colors"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <h3 className="font-display font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="group relative rounded-lg bg-[#0d1117] border border-[#30363d] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <code className="text-green-400 font-mono text-sm">{command}</code>
          <CopyButton text={command} variant="minimal" className="opacity-50 group-hover:opacity-100" />
        </div>
      </div>
    </motion.div>
  );
};

// Feature Card Component
const FeatureCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
}> = ({ icon, title, description }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="group p-6 rounded-xl border border-border bg-card/50 hover:bg-card hover:border-primary/30 transition-all duration-300"
  >
    <div className="flex items-start gap-4">
      <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
        {icon}
      </div>
      <div>
        <h3 className="font-display font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  </motion.div>
);

// CLI Reference Row with Copy
const CLIRow: React.FC<{
  command: string;
  description: string;
  isLast?: boolean;
}> = ({ command, description, isLast = false }) => {
  return (
    <tr className={`group hover:bg-muted/50 transition-colors ${!isLast ? 'border-b border-border' : ''}`}>
      <td className="p-4">
        <div className="flex items-center gap-2">
          <code className="text-primary font-mono text-sm bg-primary/10 px-2 py-1 rounded">{command}</code>
          <CopyButton text={command} variant="minimal" className="opacity-0 group-hover:opacity-100" />
        </div>
      </td>
      <td className="p-4 text-muted-foreground text-sm">{description}</td>
    </tr>
  );
};

const Index = () => {
  const [copiedHero, setCopiedHero] = useState(false);

  const handleCopyHero = async () => {
    await navigator.clipboard.writeText('npx envdrift sync');
    setCopiedHero(true);
    setTimeout(() => setCopiedHero(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-6 h-6 text-primary" />
            <span className="font-display font-bold text-lg">EnvDrift</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">Features</a>
            <a href="#installation" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">Install</a>
            <a href="#cli-reference" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">CLI</a>
            <a
              href="https://github.com/sol-21/envdrift"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border hover:bg-muted transition-colors"
            >
              <Github className="w-4 h-4" />
              <span className="text-sm font-medium hidden sm:block">GitHub</span>
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-50" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8"
          >
            <Shield className="w-4 h-4" />
            Protect your secrets
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-4 mb-6"
          >
            <Terminal className="w-14 h-14 text-primary" />
            <h1 className="font-display text-5xl md:text-7xl font-bold text-foreground tracking-tight">
              EnvDrift
            </h1>
          </motion.div>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Sync your <code className="text-primary font-mono bg-primary/10 px-2 py-0.5 rounded">.env</code> files safely.
            <br className="hidden sm:block" />
            <span className="text-foreground font-medium">Never leak secrets again.</span>
          </motion.p>

          {/* Hero Command */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-md mx-auto mb-8"
          >
            <div className="group relative rounded-xl bg-[#0d1117] border-2 border-[#30363d] hover:border-primary/50 overflow-hidden transition-colors shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="text-green-400 font-mono text-lg">$</span>
                  <code className="text-green-400 font-mono text-lg font-medium">npx envdrift sync</code>
                </div>
                <button
                  onClick={handleCopyHero}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-all"
                >
                  {copiedHero ? (
                    <>
                      <Check className="w-5 h-5 text-green-400" />
                      <span className="text-sm text-green-400 font-medium">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5 text-gray-300" />
                      <span className="text-sm text-gray-300 font-medium">Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button size="lg" asChild className="bg-primary hover:bg-primary/90">
              <a href="#quick-start">
                Get Started
                <ChevronRight className="w-4 h-4 ml-1" />
              </a>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a href="https://github.com/sol-21/envdrift" target="_blank" rel="noopener noreferrer">
                <Github className="w-4 h-4 mr-2" />
                View on GitHub
              </a>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Quick Start */}
      <section id="quick-start" className="px-6 py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-4xl font-bold mb-4">Quick Start</h2>
            <p className="text-muted-foreground text-lg">Get up and running in seconds</p>
          </motion.div>

          <div className="grid gap-8">
            <TerminalBlock
              step={1}
              title="Check for drift"
              command="npx envdrift check"
              output={EXAMPLES.check}
            />
            <TerminalBlock
              step={2}
              title="Preview changes (dry run)"
              command="npx envdrift sync --dry-run"
              output={EXAMPLES.syncDryRun}
            />
            <TerminalBlock
              step={3}
              title="Sync and scrub"
              command="npx envdrift sync"
              output={EXAMPLES.sync}
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-4xl font-bold mb-4">Features</h2>
            <p className="text-muted-foreground text-lg">Built for security-conscious developers</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            <FeatureCard
              icon={<Shield className="w-6 h-6" />}
              title="Smart Scrubbing"
              description="Automatically detects and scrubs sensitive values like passwords, API keys, and tokens based on key names and value patterns."
            />
            <FeatureCard
              icon={<AlertTriangle className="w-6 h-6" />}
              title="Provider Detection"
              description="Recognizes secrets from AWS, Stripe, GitHub, PostgreSQL, MongoDB, and more—even if the key name is misleading."
            />
            <FeatureCard
              icon={<Terminal className="w-6 h-6" />}
              title="Strict Mode"
              description="Use --strict to scrub ALL values regardless of key name. Maximum security for the most paranoid developers."
            />
            <FeatureCard
              icon={<BookOpen className="w-6 h-6" />}
              title="Dry Run Preview"
              description="Use --dry-run to see exactly what would be written before making any changes. Full transparency, zero surprises."
            />
          </div>
        </div>
      </section>

      {/* Strict Mode Example */}
      <section className="px-6 py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-sm font-medium mb-4">
              <AlertTriangle className="w-4 h-4" />
              Paranoid Mode
            </div>
            <h2 className="font-display text-4xl font-bold mb-4">Strict Mode</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              For maximum security, use <code className="text-primary font-mono bg-primary/10 px-2 py-0.5 rounded">--strict</code> to scrub every single value.
            </p>
          </motion.div>

          <TerminalBlock
            command="npx envdrift sync --strict"
            output={EXAMPLES.syncStrict}
          />
        </div>
      </section>

      {/* Output Example */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-sm font-medium mb-4">
              <CheckCircle2 className="w-4 h-4" />
              Safe to Commit
            </div>
            <h2 className="font-display text-4xl font-bold mb-4">Generated Output</h2>
            <p className="text-muted-foreground text-lg">
              Your <code className="text-primary font-mono bg-primary/10 px-2 py-0.5 rounded">.env.example</code> will be clean and safe to commit.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-xl border border-[#30363d] bg-[#0d1117] overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between px-4 py-3 bg-[#161b22] border-b border-[#30363d]">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                  <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                </div>
                <span className="ml-2 text-sm font-mono text-gray-400">.env.example</span>
              </div>
              <CopyButton text={EXAMPLES.envExample} variant="prominent" />
            </div>
            <pre className="p-6 font-mono text-sm text-gray-300 overflow-x-auto leading-relaxed">
              {EXAMPLES.envExample}
            </pre>
          </motion.div>
        </div>
      </section>

      {/* Installation */}
      <section id="installation" className="px-6 py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-display text-4xl font-bold mb-4">Installation</h2>
            <p className="text-muted-foreground text-lg">Use directly with npx or install globally</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            <CommandCard
              icon={<Zap className="w-5 h-5" />}
              title="Quick Use"
              description="Run directly without installation"
              command="npx envdrift sync"
            />
            <CommandCard
              icon={<Package className="w-5 h-5" />}
              title="Global Install"
              description="Install once, use anywhere"
              command="npm install -g envdrift"
            />
          </div>
        </div>
      </section>

      {/* CLI Reference */}
      <section id="cli-reference" className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-display text-4xl font-bold mb-4">CLI Reference</h2>
            <p className="text-muted-foreground text-lg">All available commands at a glance</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-xl border border-border bg-card overflow-hidden"
          >
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-4 font-display font-semibold">Command</th>
                  <th className="text-left p-4 font-display font-semibold">Description</th>
                </tr>
              </thead>
              <tbody>
                <CLIRow command="envdrift check" description="Detect drift between .env and .env.example" />
                <CLIRow command="envdrift sync" description="Sync and scrub .env.example with smart detection" />
                <CLIRow command="envdrift sync --dry-run" description="Preview changes without modifying files" />
                <CLIRow command="envdrift sync --strict" description="Scrub ALL values (paranoid mode)" />
                <CLIRow command="envdrift --help" description="Show help information" isLast />
              </tbody>
            </table>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20 bg-gradient-to-b from-muted/30 to-background">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-3xl font-bold mb-4">Ready to secure your env files?</h2>
            <p className="text-muted-foreground text-lg mb-8">
              Start using EnvDrift today. It's open source and free forever.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild className="bg-primary hover:bg-primary/90">
                <a href="#quick-start">
                  Get Started
                  <ChevronRight className="w-4 h-4 ml-1" />
                </a>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="https://github.com/sol-21/envdrift" target="_blank" rel="noopener noreferrer">
                  <Github className="w-4 h-4 mr-2" />
                  Star on GitHub
                </a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-primary" />
              <span className="font-display font-bold text-lg">EnvDrift</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Built with <span className="text-red-500">♥</span> for developers who care about security
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/sol-21/envdrift"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="GitHub"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="https://www.npmjs.com/package/envdrift"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="npm"
              >
                <Package className="w-5 h-5" />
              </a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">
              MIT License © {new Date().getFullYear()} EnvDrift. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
