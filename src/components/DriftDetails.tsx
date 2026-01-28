import React from 'react';
import { ChevronDown, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface DriftDetailsProps {
  missingInExample: string[];
  missingInLocal: string[];
}

interface DriftSectionProps {
  title: string;
  description: string;
  keys: string[];
  type: 'add' | 'missing';
}

const DriftSection: React.FC<DriftSectionProps> = ({
  title,
  description,
  keys,
  type,
}) => {
  const [isOpen, setIsOpen] = React.useState(keys.length > 0);

  const Icon = type === 'add' ? Plus : Minus;
  const colorClass = type === 'add' ? 'text-warning' : 'text-destructive';
  const bgClass = type === 'add' ? 'bg-warning/10' : 'bg-destructive/10';
  const borderClass = type === 'add' ? 'border-warning/30' : 'border-destructive/30';

  if (keys.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            'w-full flex items-center justify-between p-4 rounded-lg border transition-all hover:bg-muted/50',
            borderClass,
            bgClass
          )}
        >
          <div className="flex items-center gap-3">
            <Icon className={cn('w-5 h-5', colorClass)} />
            <div className="text-left">
              <p className={cn('font-display font-semibold text-sm', colorClass)}>
                {title}
              </p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('text-sm font-mono font-bold', colorClass)}>
              {keys.length}
            </span>
            <ChevronDown
              className={cn(
                'w-4 h-4 text-muted-foreground transition-transform',
                isOpen && 'rotate-180'
              )}
            />
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 p-3 rounded-lg bg-muted/30 border border-border"
          >
            <div className="flex flex-wrap gap-2">
              {keys.map((key, index) => (
                <motion.code
                  key={key}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'px-2 py-1 rounded text-xs font-mono border',
                    type === 'add'
                      ? 'bg-warning/20 border-warning/30 text-warning'
                      : 'bg-destructive/20 border-destructive/30 text-destructive'
                  )}
                >
                  {key}
                </motion.code>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </CollapsibleContent>
    </Collapsible>
  );
};

const DriftDetails: React.FC<DriftDetailsProps> = ({
  missingInExample,
  missingInLocal,
}) => {
  if (missingInExample.length === 0 && missingInLocal.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <DriftSection
        title="New Secrets to Document"
        description="Keys in .env but missing from .env.example"
        keys={missingInExample}
        type="add"
      />
      <DriftSection
        title="Missing Local Setup"
        description="Keys in .env.example but missing from .env"
        keys={missingInLocal}
        type="missing"
      />
    </div>
  );
};

export default DriftDetails;
