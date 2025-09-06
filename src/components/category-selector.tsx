'use client';

import * as React from 'react';
import { useIsDesktop } from '@/hooks/use-media-query';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Drawer, DrawerContent, DrawerTrigger, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { CategoryName, getCategoriesByAffiliation, getBothCategories } from '@/types/category';
import { CategoryIcon } from '@/components/ui/category-icon';
import { useCategoryRanking } from '@/hooks/use-category-ranking';
import { cn } from '@/lib/utils';

interface CategorySelectorProps {
  value: string;
  onChange: (value: string) => void;
  type: 'expense' | 'income';
  categories?: readonly CategoryName[];
  disabledCategories?: readonly string[];
  className?: string;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hasError?: boolean;
}

export function CategorySelector({
  value,
  onChange,
  type,
  categories: customCategories,
  disabledCategories = [],
  className,
  disabled,
  open: controlledOpen,
  onOpenChange,
  hasError,
}: CategorySelectorProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const isDesktop = useIsDesktop();
  const { getRankedCategories } = useCategoryRanking();

  // Use custom categories if provided, otherwise get ranked categories for this type
  const categories = customCategories || getRankedCategories(type);

  const trigger = (
    <Button
      variant="secondary"
      role="combobox"
      aria-expanded={open}
      size='icon'
      disabled={disabled}
      aria-invalid={!!hasError}
      className={cn(hasError ? 'border-2 border-destructive' : undefined)}
    >
      {value ? <CategoryIcon category={value} /> : <ChevronDown className="h-4 w-4" />}
    </Button>
  );

  if (isDesktop) {
    return (
      <div className={className}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            {trigger}
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[300px] p-0">
            <CategoryList
              value={value}
              categories={categories}
              disabledCategories={disabledCategories}
              onSelect={(category) => {
                onChange(category);
                setOpen(false);
              }}
              type={type}
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className={className}>
      <Drawer open={open} onOpenChange={setOpen} autoFocus={isDesktop}>
        <DrawerTrigger asChild>
          {trigger}
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="sr-only">
            <DrawerTitle>Select Category</DrawerTitle>
            <DrawerDescription>Choose a category from the list</DrawerDescription>
          </DrawerHeader>
          <div className="mt-4 border-t">
            <CategoryList
              value={value}
              categories={categories}
              disabledCategories={disabledCategories}
              onSelect={(category) => {
                onChange(category);
                setOpen(false);
              }}
              type={type}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function CategoryList({
  value,
  categories,
  disabledCategories = [],
  onSelect,
  type,
}: {
  value: string;
  categories: readonly CategoryName[];
  disabledCategories?: readonly string[];
  onSelect: (category: string) => void;
  type: 'expense' | 'income';
}) {
  const [search, setSearch] = React.useState('');
  const { recentCategories } = useCategoryRanking();
  
  // Filter based on search
  const filteredCategories = React.useMemo(() => {
    if (!search) return categories;
    
    const query = search.toLowerCase();
    return categories.filter(category => 
      category.toLowerCase().includes(query)
    );
  }, [search, categories]);

  const recentForType = recentCategories[type] || [];
  const affiliatedCategories = getCategoriesByAffiliation(type);
  const bothCategories = getBothCategories();

  return (
    <Command>
      <CommandInput 
        placeholder="Search categories..." 
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No category found.</CommandEmpty>
        <CommandGroup>
          {filteredCategories.map((category, index) => {
            const isRecent = recentForType.includes(category);
            const isAffiliated = affiliatedCategories.includes(category);
            const isBoth = bothCategories.includes(category);
            const isDisabled = disabledCategories.includes(category);
            const prevCategory = index > 0 ? filteredCategories[index - 1] : null;
            const prevIsRecent = prevCategory ? recentForType.includes(prevCategory) : false;
            const prevIsAffiliated = prevCategory ? affiliatedCategories.includes(prevCategory) : false;
            const prevIsBoth = prevCategory ? bothCategories.includes(prevCategory) : false;
            
            // Show separator when transitioning between sections:
            // recent -> affiliated, affiliated -> both, both -> other
            const showSeparator = !search && index > 0 && (
              (prevIsRecent && !isRecent) || 
              (prevIsAffiliated && !isAffiliated && !isRecent) ||
              (prevIsBoth && !isBoth && !isAffiliated && !isRecent)
            );
            
            return (
              <React.Fragment key={category}>
                {showSeparator && (
                  <div className="h-px bg-border my-1 mx-2" />
                )}
                <CommandItem
                  value={category}
                  onSelect={() => {
                    if (!isDisabled) {
                      onSelect(category);
                      setSearch('');
                    }
                  }}
                  className={`flex items-center gap-3 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={isDisabled}
                >
                  <CategoryIcon category={category} />
                  <span className="flex-1">{category}</span>
                  {value === category && (
                    <span className="text-primary">✓</span>
                  )}
                  {isDisabled && (
                    <span className="text-xs text-muted-foreground">Already budgeted</span>
                  )}
                </CommandItem>
              </React.Fragment>
            );
          })}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}