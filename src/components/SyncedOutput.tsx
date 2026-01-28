import React, { useState } from 'react';
import { Download, Copy, Check, FileCode } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface SyncedOutputProps {
  content: string;
  isVisible: boolean;
}

const SyncedOutput: React.FC<SyncedOutputProps> = ({ content, isVisible }) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  if (!isVisible || !content) {
    return null;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Content copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '.env.example';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Downloaded!',
      description: '.env.example file saved',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border-2 border-success/30 bg-success/5 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-success/10 border-b border-success/20">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-success" />
          <span className="font-display font-semibold text-sm text-success">
            Synced .env.example
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="h-8 text-xs border-success/30 hover:bg-success/10"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 mr-1 text-success" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 mr-1" />
                Copy
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="h-8 text-xs border-success/30 hover:bg-success/10"
          >
            <Download className="w-3 h-3 mr-1" />
            Download
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-h-[300px] overflow-auto">
        <pre className="font-mono text-xs text-foreground whitespace-pre-wrap">
          {content}
        </pre>
      </div>
    </motion.div>
  );
};

export default SyncedOutput;
