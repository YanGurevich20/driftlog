'use client';

import { useContext } from 'react';
import { Plus, WandSparkles } from 'lucide-react';
import { DualModeCard, DualModeCardHeader, DualModeCardContent, DualModeCardContext } from '@/components/ui/dual-mode-card';
import { EntryFormInline } from '@/components/entry-form-inline';
import { LLMEntryInput } from '@/components/llm-entry-input';

function DualModeCardContentRenderer({ 
  onDateChange, 
  onEntryCreated 
}: { 
  onDateChange?: (date: Date) => void;
  onEntryCreated?: (entryId: string) => void;
}) {
  const { activeMode } = useContext(DualModeCardContext);

  if (activeMode === 'auto') {
    return (
      <LLMEntryInput
        onDateChange={onDateChange}
        onEntryCreated={onEntryCreated}
      />
    );
  }

  if (activeMode === 'manual') {
    return (
      <EntryFormInline
        onDateChange={onDateChange}
        onEntryCreated={onEntryCreated}
      />
    );
  }

  return null;
}

interface NewEntryViewProps {
  onDateChange?: (date: Date) => void;
  onEntryCreated?: (entryId: string) => void;
}

export function NewEntryView({ onDateChange, onEntryCreated }: NewEntryViewProps) {
  return (
    <DualModeCard defaultCollapsed={true}>
      <DualModeCardHeader
        leftTrigger={{
          icon: <WandSparkles className="size-4" />,
          label: "Auto Entry",
          onClick: () => {}
        }}
        rightTrigger={{
          icon: <Plus className="size-4" />,
          label: "Manual Entry",
          onClick: () => {}
        }}
      />
      <DualModeCardContent>
        <DualModeCardContentRenderer
          onDateChange={onDateChange}
          onEntryCreated={onEntryCreated}
        />
      </DualModeCardContent>
    </DualModeCard>
  );
}