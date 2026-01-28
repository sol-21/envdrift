import React, { useCallback, useRef, useState } from 'react';
import { Upload, FileText, X, Clipboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { readFileContent } from '@/lib/envUtils';
import { cn } from '@/lib/utils';

interface FileInputPanelProps {
  title: string;
  filename: string;
  content: string;
  onContentChange: (content: string) => void;
  panelRef?: React.RefObject<HTMLDivElement>;
}

const FileInputPanel: React.FC<FileInputPanelProps> = ({
  title,
  filename,
  content,
  onContentChange,
  panelRef,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      const content = await readFileContent(file);
      onContentChange(content);
    }
  }, [onContentChange]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const content = await readFileContent(file);
      onContentChange(content);
    }
  }, [onContentChange]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      onContentChange(text);
    } catch (error) {
      console.error('Failed to read clipboard:', error);
    }
  }, [onContentChange]);

  const handleClear = useCallback(() => {
    onContentChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onContentChange]);

  return (
    <div
      ref={panelRef}
      className={cn(
        'flex flex-col h-full rounded-lg border-2 transition-all duration-300',
        isDragging
          ? 'border-primary glow-primary bg-primary/5'
          : 'border-border bg-card'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <span className="font-display font-semibold text-sm">{title}</span>
          <code className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
            {filename}
          </code>
        </div>
        {content && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-7 px-2 text-muted-foreground hover:text-destructive"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 p-4">
        {!content ? (
          <div
            className={cn(
              'h-full flex flex-col items-center justify-center gap-4 rounded-md border-2 border-dashed transition-colors',
              isDragging ? 'border-primary bg-primary/10' : 'border-muted-foreground/30'
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="w-10 h-10 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Drag & drop your <code className="text-primary">{filename}</code> file here
              </p>
              <p className="text-xs text-muted-foreground mt-1">or</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs"
              >
                <Upload className="w-3 h-3 mr-1" />
                Browse
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePaste}
                className="text-xs"
              >
                <Clipboard className="w-3 h-3 mr-1" />
                Paste
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".env,.env.example,.env.local,.env.development,.env.production,text/plain"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        ) : (
          <Textarea
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            className="h-full min-h-[200px] font-mono text-xs bg-background border-muted resize-none"
            placeholder="Paste your env content here..."
          />
        )}
      </div>
    </div>
  );
};

export default FileInputPanel;
