'use client';

import * as React from 'react';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Drawer, DrawerContent, DrawerTrigger, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { CURRENCIES, getCurrencyByCode, getPopularCurrencies } from '@/lib/currencies';
import { usePreferences } from '@/store/preferences';
import { useAuth } from '@/lib/auth-context';

interface CurrencySelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
}

export function CurrencySelector({
  value,
  onChange,
  className,
  triggerClassName,
  disabled
}: CurrencySelectorProps) {
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  
  const selectedCurrency = getCurrencyByCode(value) || CURRENCIES[0];

  const trigger = (
    <Button
      variant="outline"
      role="combobox"
      aria-expanded={open}
      className={triggerClassName || "w-full justify-between"}
      disabled={disabled}
    >
      <span className="flex items-center gap-2">
        <span className="font-medium">{selectedCurrency.code}</span>
        <span className="text-muted-foreground">{selectedCurrency.symbol}</span>
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
            <CurrencyList 
              value={value}
              onSelect={(currency) => {
                onChange(currency);
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
            <DrawerTitle>Select Currency</DrawerTitle>
            <DrawerDescription>Choose your preferred currency from the list</DrawerDescription>
          </DrawerHeader>
          <div className="mt-4 border-t">
            <CurrencyList 
              value={value}
              onSelect={(currency) => {
                onChange(currency);
                setOpen(false);
              }}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function CurrencyList({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (currency: string) => void;
}) {
  const [search, setSearch] = React.useState('');
  const { lastUsedCurrency } = usePreferences();
  const { user } = useAuth();
  
  // Smart currency ordering
  const sortedCurrencies = React.useMemo(() => {
    const currencyMap = new Map(CURRENCIES.map(c => [c.code, c]));
    const ordered: typeof CURRENCIES = [];
    const added = new Set<string>();
    
    // 1. Last used currency (if exists)
    if (lastUsedCurrency && currencyMap.has(lastUsedCurrency)) {
      ordered.push(currencyMap.get(lastUsedCurrency)!);
      added.add(lastUsedCurrency);
    }
    
    // 2. User's preferred currency (if different from last used)
    if (user?.preferredCurrency && !added.has(user.preferredCurrency) && currencyMap.has(user.preferredCurrency)) {
      ordered.push(currencyMap.get(user.preferredCurrency)!);
      added.add(user.preferredCurrency);
    }
    
    // 3. Major currencies (in their defined order)
    const majorCurrencies = getPopularCurrencies()
      .filter(c => !added.has(c.code));
    ordered.push(...majorCurrencies);
    majorCurrencies.forEach(c => added.add(c.code));
    
    // 4. All other currencies (alphabetically)
    const otherCurrencies = CURRENCIES
      .filter(c => !added.has(c.code))
      .sort((a, b) => a.code.localeCompare(b.code));
    ordered.push(...otherCurrencies);
    
    return ordered;
  }, [lastUsedCurrency, user?.preferredCurrency]);
  
  // Filter based on search
  const filteredCurrencies = React.useMemo(() => {
    if (!search) return sortedCurrencies;
    
    const query = search.toLowerCase();
    return sortedCurrencies.filter(c => 
      c.code.toLowerCase().includes(query) ||
      c.name.toLowerCase().includes(query) ||
      c.symbol.toLowerCase().includes(query)
    );
  }, [search, sortedCurrencies]);

  return (
    <Command>
      <CommandInput 
        placeholder="Search currencies..." 
        value={search}
        onValueChange={setSearch}
        autoFocus
      />
      <CommandList>
        <CommandEmpty>No currency found.</CommandEmpty>
        <CommandGroup>
          {filteredCurrencies.map((currency, index) => {
            // Visual separator after last used and preferred currencies
            const showSeparator = 
              (index === 0 && lastUsedCurrency === currency.code) ||
              (index === 1 && user?.preferredCurrency === currency.code && lastUsedCurrency !== user?.preferredCurrency);
            
            return (
              <React.Fragment key={currency.code}>
                <CommandItem
                  value={`${currency.code} ${currency.name} ${currency.symbol}`}
                  onSelect={() => {
                    onSelect(currency.code);
                    setSearch('');
                  }}
                  className="flex items-center gap-3"
                >
                  <span className="font-medium w-10">{currency.code}</span>
                  <span className="w-6 text-center">{currency.symbol}</span>
                  <span className="text-muted-foreground flex-1">{currency.name}</span>
                  {value === currency.code && (
                    <span className="text-primary">✓</span>
                  )}
                </CommandItem>
                {showSeparator && <div className="h-px bg-border my-1" />}
              </React.Fragment>
            );
          })}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}