'use client';

import { useState } from 'react';
import { ComboInput } from '@/components/ui/combo-input';
import { processEntry } from '@/lib/ai/ai';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { toUTCMidnight } from '@/lib/date-utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, FileText, Volume2, ImageIcon } from 'lucide-react';
import { format } from 'date-fns';

interface ParsedEntry {
  type: 'expense' | 'income';
  amount: number;
  currency: string;
  category: string;
  description?: string;
  date: string;
  confidence: number;
}

// Utility function to truncate file names with ellipsis
const truncateFileName = (fileName: string, maxLength: number = 20): string => {
  if (fileName.length <= maxLength) return fileName;
  
  const extension = fileName.split('.').pop() || '';
  const nameWithoutExt = fileName.slice(0, -(extension.length + 1));
  const availableLength = maxLength - extension.length - 4; // 4 for "..." and "."
  
  if (availableLength <= 0) return `...${extension}`;
  
  return `${nameWithoutExt.slice(0, availableLength)}...${extension}`;
};

// Get file icon based on file type
const getFileIcon = (file: File) => {
  if (file.type.startsWith('image/')) return <ImageIcon />;
  if (file.type.startsWith('audio/')) return <Volume2 />;
  return <FileText />;
};

interface LLMEntryInputProps {
  onDateChange?: (date: Date) => void;
}

export function LLMEntryInput({ onDateChange }: LLMEntryInputProps) {
  const { user } = useAuth();
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const clearSelectedFile = () => {
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

          await addDoc(collection(db, 'entries'), entryData);
          
          const entryDate = new Date(parsed.date);
          toast.success('Entry created successfully', {
            description: format(entryDate, 'EEEE, MMMM d, yyyy'),
            action: {
              label: 'View',
              onClick: () => {
                // Update the daily view date directly
                onDateChange?.(entryDate);
              },
            },
          });
          
          // Clear the form
          setInputText('');
          setSelectedFile(null);
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
    <div className="fixed bottom-0 left-0 right-0 p-4">
      <div className="mx-auto max-w-full md:max-w-lg">
        <Card className="border-2">
          <CardContent>
            <div onKeyDown={handleKeyDown}>
              {selectedFile && (
                <div className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2 mb-3">
                  <div className="flex items-center gap-2">
                    {getFileIcon(selectedFile)}
                    <span className="text-sm text-muted-foreground">
                      {truncateFileName(selectedFile.name)}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearSelectedFile}
                    disabled={isLoading}
                  >
                    <X />
                  </Button>
                </div>
              )}
              
              <ComboInput
                value={inputText}
                onChange={setInputText}
                placeholder={selectedFile ? '(optional) Add details...' : 'Describe an entry...'}
                onSubmit={handleSubmit}
                selectedFile={selectedFile}
                onFileSelect={setSelectedFile}
                isLoading={isLoading}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}