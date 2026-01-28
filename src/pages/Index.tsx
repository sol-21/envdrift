import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Terminal, GitCompare, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import FileInputPanel from '@/components/FileInputPanel';
import DriftStatus from '@/components/DriftStatus';
import StatsCards from '@/components/StatsCards';
import DriftDetails from '@/components/DriftDetails';
import SyncedOutput from '@/components/SyncedOutput';
import FlyingKeysAnimation from '@/components/FlyingKeysAnimation';
import {
  parseEnvContent,
  extractKeys,
  detectDrift,
  generateSyncedExample,
} from '@/lib/envUtils';

interface FlyingKey {
  id: string;
  key: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

const Index = () => {
  const [envContent, setEnvContent] = useState('');
  const [exampleContent, setExampleContent] = useState('');
  const [syncedOutput, setSyncedOutput] = useState('');
  const [showOutput, setShowOutput] = useState(false);
  const [flyingKeys, setFlyingKeys] = useState<FlyingKey[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const envPanelRef = useRef<HTMLDivElement>(null);
  const examplePanelRef = useRef<HTMLDivElement>(null);

  // Parse and analyze
  const envEntries = useMemo(() => parseEnvContent(envContent), [envContent]);
  const exampleEntries = useMemo(() => parseEnvContent(exampleContent), [exampleContent]);

  const envKeys = useMemo(() => extractKeys(envEntries), [envEntries]);
  const exampleKeys = useMemo(() => extractKeys(exampleEntries), [exampleEntries]);

  const driftResult = useMemo(
    () => detectDrift(envKeys, exampleKeys),
    [envKeys, exampleKeys]
  );

  const hasContent = envContent.length > 0 || exampleContent.length > 0;
  const canSync = envContent.length > 0 && driftResult.missingInExample.length > 0;

  const handleSync = useCallback(() => {
    if (!canSync || isSyncing) return;

    setIsSyncing(true);

    // Calculate positions for flying animation
    const envRect = envPanelRef.current?.getBoundingClientRect();
    const exampleRect = examplePanelRef.current?.getBoundingClientRect();

    if (envRect && exampleRect) {
      const newFlyingKeys: FlyingKey[] = driftResult.missingInExample.map(
        (key, index) => ({
          id: `${key}-${Date.now()}-${index}`,
          key,
          startX: envRect.left + envRect.width / 2 - 50,
          startY: envRect.top + 100 + index * 30,
          endX: exampleRect.left + exampleRect.width / 2 - 50,
          endY: exampleRect.top + 100,
        })
      );

      setFlyingKeys(newFlyingKeys);
    } else {
      // Fallback if refs not available
      completeSync();
    }
  }, [canSync, isSyncing, driftResult.missingInExample]);

  const completeSync = useCallback(() => {
    const output = generateSyncedExample(envEntries, exampleEntries);
    setSyncedOutput(output);
    setShowOutput(true);
    setFlyingKeys([]);
    setIsSyncing(false);
  }, [envEntries, exampleEntries]);

  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      {/* Flying Keys Animation Overlay */}
      <FlyingKeysAnimation keys={flyingKeys} onComplete={completeSync} />

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <div className="flex items-center justify-center gap-3">
            <Terminal className="w-10 h-10 text-primary" />
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground terminal-text">
              EnvDrift
            </h1>
          </div>
          <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
            Keep your <code className="text-primary">.env</code> and{' '}
            <code className="text-primary">.env.example</code> files in perfect sync.
            Never leak secrets, never miss a variable.
          </p>
        </motion.header>

        {/* File Input Panels */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid md:grid-cols-2 gap-4 min-h-[300px]"
        >
          <FileInputPanel
            title="Local Secrets"
            filename=".env"
            content={envContent}
            onContentChange={setEnvContent}
            panelRef={envPanelRef}
          />
          <FileInputPanel
            title="Template File"
            filename=".env.example"
            content={exampleContent}
            onContentChange={setExampleContent}
            panelRef={examplePanelRef}
          />
        </motion.section>

        {/* Drift Status */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center gap-4"
        >
          <DriftStatus isSynced={driftResult.isSynced} hasContent={hasContent} />

          {canSync && (
            <Button
              size="lg"
              onClick={handleSync}
              disabled={isSyncing}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-display font-bold glow-primary"
            >
              <GitCompare className="w-5 h-5 mr-2" />
              {isSyncing ? 'Syncing...' : 'Sync Files'}
              <Zap className="w-4 h-4 ml-2" />
            </Button>
          )}
        </motion.section>

        {/* Stats Cards */}
        {hasContent && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <StatsCards
              envKeyCount={envKeys.length}
              exampleKeyCount={exampleKeys.length}
              missingInExampleCount={driftResult.missingInExample.length}
              missingInLocalCount={driftResult.missingInLocal.length}
            />
          </motion.section>
        )}

        {/* Drift Details */}
        {hasContent && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <DriftDetails
              missingInExample={driftResult.missingInExample}
              missingInLocal={driftResult.missingInLocal}
            />
          </motion.section>
        )}

        {/* Synced Output */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <SyncedOutput content={syncedOutput} isVisible={showOutput} />
        </motion.section>

        {/* Footer */}
        <footer className="text-center text-xs text-muted-foreground pt-8 border-t border-border">
          <p>
            Built with <span className="text-primary">♥</span> for developers who care about security
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
