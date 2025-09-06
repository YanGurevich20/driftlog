'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { CategorySelector } from '@/components/category-selector';
import { CategoryIcon } from '@/components/ui/category-icon';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiCategorySelectorProps {
  value: string[];
  onChange: (categories: string[]) => void;
  type: 'expense' | 'income';
  className?: string;
  disabled?: boolean;
  maxItems?: number;
  disabledCategories?: string[];
  hasError?: boolean;
  onInteract?: () => void;
}

export function MultiCategorySelector({
  value = [],
  onChange,
  type,
  className,
  disabled,
  maxItems,
  disabledCategories = [],
  hasError = false,
  onInteract,
}: MultiCategorySelectorProps) {
  const [isAddingCategory, setIsAddingCategory] = React.useState(false);
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const [autoOpen, setAutoOpen] = React.useState(false);

  const handleCategorySelect = (category: string) => {
    onInteract?.();
    if (!value.includes(category)) {
      onChange([...value, category]);
    }
    setIsAddingCategory(false);
    setAutoOpen(false);
    setHoveredIndex(null);
  };

  const handleStartAdding = () => {
    onInteract?.();
    setIsAddingCategory(true);
    setAutoOpen(true);
  };

  const handleRemoveCategory = (index: number) => {
    onInteract?.();
    const newCategories = value.filter((_, i) => i !== index);
    onChange(newCategories);
  };

  const availableCategories = React.useMemo(() => {
    // Combine already selected categories with externally disabled categories
    return [...value, ...disabledCategories];
  }, [value, disabledCategories]);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {value.map((category, index) => (
        <Button
          key={`${category}-${index}`}
          variant="secondary"
          size="icon"
          disabled={disabled}
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
          onClick={() => handleRemoveCategory(index)}
          className="relative"
        >
          {hoveredIndex === index ? (
            <Trash2 className="text-destructive" />
          ) : (
            <CategoryIcon category={category} />
          )}
          {/* Red dot indicator for mobile - always visible to show deletable */}
          <div className="absolute -top-1 -right-1 size-2 bg-destructive rounded-full md:hidden" />
        </Button>
      ))}
      
      {maxItems && value.length >= maxItems ? null : (
        isAddingCategory ? (
          <CategorySelector
            value=""
            onChange={handleCategorySelect}
            type={type}
            disabledCategories={availableCategories}
            disabled={disabled}
            open={autoOpen}
            onOpenChange={(open) => {
              setAutoOpen(open);
              if (!open) {
                setIsAddingCategory(false);
              }
            }}
          />
        ) : (
          <Button
            variant="ghost"
            size="icon"
            disabled={disabled}
            onClick={handleStartAdding}
            className={cn(
              'border-2 border-dashed',
              hasError ? 'border-destructive hover:border-destructive' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            )}
          >
            <Plus />
          </Button>
        )
      )}
    </div>
  );
}