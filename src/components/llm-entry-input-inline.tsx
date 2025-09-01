'use client';

import { useState, useRef } from 'react';
import { processEntry } from '@/lib/ai/ai';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { toUTCMidnight } from '@/lib/date-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, FileText, Volume2, ImageIcon, Paperclip, Send, Loader2 } from 'lucide-react';
import { LLMEntryDebug } from '@/components/llm-entry-debug';

interface ParsedEntry {
  type: 'expense' | 'income';
  amount: number;
  currency: string;
  category: string;
  description?: string;
  date: string;
  confidence: number;
}

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'audio/aac', 'audio/flac', 'audio/mp3', 'audio/m4a', 'audio/mpeg', 'audio/mpga', 'audio/mp4', 'audio/opus', 'audio/pcm', 'audio/wav', 'audio/webm', 'application/pdf'];

const truncateFileName = (fileName: string, maxLength: number = 20): string => {
  if (fileName.length <= maxLength) return fileName;
  const extension = fileName.split('.').pop() || '';
  const nameWithoutExt = fileName.slice(0, -(extension.length + 1));
  const availableLength = maxLength - extension.length - 4;
  if (availableLength <= 0) return `...${extension}`;
  return `${nameWithoutExt.slice(0, availableLength)}...${extension}`;
};

const getFileIcon = (file: File) => {
  if (file.type.startsWith('image/')) return <ImageIcon className="size-4" />;
  if (file.type.startsWith('audio/')) return <Volume2 className="size-4" />;
  return <FileText className="size-4" />;
};

interface LLMEntryInputInlineProps {
  onDateChange?: (date: Date) => void;
  onEntryCreated?: (entryId: string) => void;
}

export function LLMEntryInputInline({ onDateChange, onEntryCreated }: LLMEntryInputInlineProps) {
  const { user } = useAuth();
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (ALLOWED_TYPES.includes(file.type)) {
      setSelectedFile(file);
    } else {
      toast.error('Please select a supported file type (image, audio, or PDF)');
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearForm = () => {
    setInputText('');
    setSelectedFile(null);
  };

  const handleSubmit = async () => {
    if (!inputText.trim() && !selectedFile) {
      toast.error('Please enter text or select a file to process');
      return;
    }
    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    setIsLoading(true);

    try {
      const result = await processEntry(inputText, selectedFile || undefined);
      
      try {
        const parsed: ParsedEntry = JSON.parse(result);
        
        // Check confidence and auto-create if high enough
        if (parsed.confidence >= 0.3) {
          const entryData = {
            type: parsed.type,
            userId: user.id,
            originalAmount: parsed.amount,
            currency: parsed.currency,
            category: parsed.category,
            description: parsed.description,
            date: toUTCMidnight(new Date(parsed.date)),
            createdBy: user.id,
            createdAt: serverTimestamp(),
          };

          const docRef = await addDoc(collection(db, 'entries'), entryData);
          
          const entryDate = new Date(parsed.date);
          
          // Automatically navigate to the entry date
          onDateChange?.(entryDate);
          
          // Trigger flash animation for the new entry
          onEntryCreated?.(docRef.id);
          
          // Clear the form
          clearForm();
        } else {
          toast.error("Model couldn't figure out an entry from the request");
        }
      } catch (parseError) {
        toast.error('Failed to parse structured output as JSON');
        console.error('JSON parse error:', parseError);
      }

    } catch (error) {
      console.error('Error generating content:', error);
      toast.error('Failed to generate response');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div >
      {selectedFile && (
        <div className="flex items-center justify-between bg-muted/50 rounded-md px-3">
          <div className="flex items-center gap-2">
            {getFileIcon(selectedFile)}
            <span className="text-sm text-muted-foreground">
              {truncateFileName(selectedFile.name)}
            </span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={clearSelectedFile}
            disabled={isLoading}
          >
            <X />
          </Button>
        </div>
      )}
      
      <div className="flex items-center gap-2" onKeyDown={handleKeyDown}>
        <Input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={selectedFile ? '(optional) Add details...' : 'Describe an entry...'}
          className="flex-1"
        />
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={!!selectedFile || isLoading}
          >
            <Paperclip />
          </Button>
          <LLMEntryDebug
            inputText={inputText}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            onDateChange={onDateChange}
            onEntryCreated={onEntryCreated}
            clearForm={clearForm}
          />
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={(!inputText.trim() && !selectedFile) || isLoading}
          >
            {isLoading ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        </div>
      </div>
      
      <Input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}