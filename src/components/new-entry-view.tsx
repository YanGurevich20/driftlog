'use client';

import { useState } from 'react';
import { Plus, WandSparkles } from 'lucide-react';
import { EntryForm } from '@/components/entry-form';
import { LLMEntryInput } from '@/components/llm-entry-input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

type ActiveMode = 'auto' | 'manual' | null;

interface NewEntryViewProps {
  onDateChange?: (date: Date) => void;
  onEntryCreated?: (entryId: string) => void;
}

export function NewEntryView({ onDateChange, onEntryCreated }: NewEntryViewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<ActiveMode>(null);

  const handleTriggerClick = (mode: 'auto' | 'manual') => {
    if (activeMode === mode) {
      setIsOpen(false);
    } else {
      setActiveMode(mode);
      setIsOpen(true);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CardHeader className={!isOpen ? 'border-b-0 dark:border-b-0' : undefined}>
          <div className={cn(
            'flex items-stretch w-full relative transition-all',
            isOpen && activeMode ? 'gap-0' : 'gap-2'
          )}>
            <Button
              className={cn(
                `rounded-md transition-all duration-200 overflow-hidden `,
                (activeMode === 'manual' && isOpen
                  ? 'flex-0 basis-0 px-0 opacity-0 pointer-events-none'
                  : 'flex-1')
              )}
              variant={isOpen ? 'secondary' : 'default'}
              onClick={() => handleTriggerClick('auto')}
              aria-hidden={activeMode === 'manual' && isOpen}
            >
              <div className="flex items-center gap-2 whitespace-nowrap">
                <WandSparkles className="size-4" />
                <span className="text-sm font-medium">Auto Entry</span>
              </div>
            </Button>

            <Button
              className={cn(  
                `rounded-md transition-all duration-200 overflow-hidden `,
                (activeMode === 'auto' && isOpen
                  ? 'flex-0 basis-0 px-0 opacity-0 pointer-events-none'
                  : 'flex-1')
              )}
              variant={isOpen ? 'secondary' : 'default'}
              onClick={() => handleTriggerClick('manual')}
              aria-hidden={activeMode === 'auto' && isOpen}
            >
              <div className="flex items-center gap-2 whitespace-nowrap">
                <Plus className="size-4" />
                <span className="text-sm font-medium">Manual Entry</span>
              </div>
            </Button>
          </div>
        </CardHeader>

        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down duration-200 ease-out" onAnimationEnd={(e) => {
          if (!isOpen && e.currentTarget === e.target) {
            setActiveMode(null);
          }
        }}>
          <CardContent>
            {activeMode === 'auto' && (
              <LLMEntryInput onDateChange={onDateChange} onEntryCreated={onEntryCreated} />
            )}
            {activeMode === 'manual' && (
              <EntryForm onDateChange={onDateChange} onEntryCreated={onEntryCreated} />
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}