'use client';

import * as React from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CategoryName } from '@/types/categories';
import { CategoryIcon } from '@/components/ui/category-icon';
import { useCategories } from '@/hooks/use-categories';

interface CategorySelectorProps {
  value: string;
  onChange: (value: string) => void;
  type: 'income' | 'expense';
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
}

export function CategorySelector({
  value,
  onChange,
  type,
  placeholder = "Select a category",
  className,
  triggerClassName,
  disabled
}: CategorySelectorProps) {
  const { getCategories } = useCategories();
  const [open, setOpen] = React.useState(false);

  const categories = getCategories(type);

  const selectedCategory = value || placeholder;

  const trigger = (
    <Button
      variant="ghost"
      role="combobox"
      aria-expanded={open}
      className={cn("bg-transparent dark:bg-input/30 dark:hover:bg-input/50 shadow-xs h-8 px-3", triggerClassName || "w-full justify-between")}
      disabled={disabled}
    >
      <span className="flex items-center gap-2">
        {value && <CategoryIcon category={value} />}
        <span className={cn("font-medium", !value && "text-muted-foreground")}>{selectedCategory}</span>
      </span>
      <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
    </Button>
  );

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {trigger}
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[300px] p-0">
          <CategoryList
            value={value}
            categories={categories}
            onSelect={(category) => {
              onChange(category);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function CategoryList({
  value,
  categories,
  onSelect,
}: {
  value: string;
  categories: readonly CategoryName[];
  onSelect: (category: string) => void;
}) {
  const [search, setSearch] = React.useState('');
  
  // Filter based on search
  const filteredCategories = React.useMemo(() => {
    if (!search) return categories;
    
    const query = search.toLowerCase();
    return categories.filter(category => 
      category.toLowerCase().includes(query)
    );
  }, [search, categories]);

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
          {filteredCategories.map((category) => (
            <CommandItem
              key={category}
              value={category}
              onSelect={() => {
                onSelect(category);
                setSearch('');
              }}
              className="flex items-center gap-3"
            >
              <CategoryIcon category={category} />
              <span className="flex-1">{category}</span>
              {value === category && (
                <span className="text-primary">✓</span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}