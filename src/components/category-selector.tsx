'use client';

import * as React from 'react';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Drawer, DrawerContent, DrawerTrigger, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategorySelectorProps {
  value: string;
  onChange: (value: string) => void;
  categories: readonly string[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
}

export function CategorySelector({
  value,
  onChange,
  categories,
  placeholder = "Select a category",
  className,
  triggerClassName,
  disabled
}: CategorySelectorProps) {
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  
  const selectedCategory = value || placeholder;

  const trigger = (
    <Button
      variant="ghost"
      role="combobox"
      aria-expanded={open}
      className={cn("bg-transparent dark:bg-input/30 dark:hover:bg-input/50 shadow-xs h-9 px-3", triggerClassName || "w-full justify-between")}
      disabled={disabled}
    >
      <span className="flex items-center gap-2">
        <span className={cn("font-medium", !value && "text-muted-foreground")}>{selectedCategory}</span>
      </span>
      <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
    </Button>
  );

  if (isDesktop) {
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

  return (
    <div className={className}>
      <Drawer open={open} onOpenChange={setOpen}>
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
              onSelect={(category) => {
                onChange(category);
                setOpen(false);
              }}
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
  onSelect,
}: {
  value: string;
  categories: readonly string[];
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