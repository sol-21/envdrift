import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface DriftStatusProps {
  isSynced: boolean;
  hasContent: boolean;
}

const DriftStatus: React.FC<DriftStatusProps> = ({ isSynced, hasContent }) => {
  if (!hasContent) {
    return (
      <div className="flex items-center justify-center gap-3 py-4 px-6 rounded-lg bg-muted/50 border border-border">
        <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
        <span className="font-display font-semibold text-muted-foreground">
          Awaiting input...
        </span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        'flex items-center justify-center gap-3 py-4 px-6 rounded-lg border-2 transition-all',
        isSynced
          ? 'bg-success/10 border-success glow-success'
          : 'bg-destructive/10 border-destructive glow-destructive'
      )}
    >
      {isSynced ? (
        <>
          <CheckCircle2 className="w-6 h-6 text-success" />
          <span className="font-display font-bold text-success terminal-text">
            SYNCED ✓
          </span>
        </>
      ) : (
        <>
          <AlertTriangle className="w-6 h-6 text-destructive animate-pulse" />
          <span className="font-display font-bold text-destructive terminal-text">
            DRIFT DETECTED
          </span>
        </>
      )}
    </motion.div>
  );
};

export default DriftStatus;
