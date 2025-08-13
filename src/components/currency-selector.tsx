'use client';

import * as React from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { CURRENCIES, getCurrencyByCode, getPopularCurrencies } from '@/lib/currencies';

interface CurrencySelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  triggerClassName?: string;
}

export function CurrencySelector({
  value,
  onChange,
  className,
  triggerClassName
}: CurrencySelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  
  const selectedCurrency = getCurrencyByCode(value) || CURRENCIES[0];
  
  // Sort currencies: popular first, then alphabetically by code
  const sortedCurrencies = React.useMemo(() => {
    const popular = getPopularCurrencies();
    const nonPopular = CURRENCIES.filter(c => !c.popular).sort((a, b) => 
      a.code.localeCompare(b.code)
    );
    return [...popular, ...nonPopular];
  }, []);
  
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

  // Separate popular and other currencies for display
  const popularCurrencies = filteredCurrencies.filter(c => c.popular);
  const otherCurrencies = filteredCurrencies.filter(c => !c.popular);

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={triggerClassName || "w-full justify-between"}
          >
            <span className="flex items-center gap-2">
              <span className="font-medium">{selectedCurrency.code}</span>
              <span className="text-muted-foreground">{selectedCurrency.symbol}</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end">
          <Command>
            <CommandInput 
              placeholder="Search currencies..." 
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>No currency found.</CommandEmpty>
              
              {popularCurrencies.length > 0 && (
                <CommandGroup heading="Popular Currencies">
                  {popularCurrencies.map((currency) => (
                    <CommandItem
                      key={currency.code}
                      value={`${currency.code} ${currency.name} ${currency.symbol}`}
                      onSelect={() => {
                        onChange(currency.code);
                        setOpen(false);
                        setSearch('');
                      }}
                      className="flex items-center gap-3"
                    >
                      <span className="font-medium w-10">{currency.code}</span>
                      <span className="w-6 text-center">{currency.symbol}</span>
                      <span className="text-muted-foreground flex-1">{currency.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              
              {otherCurrencies.length > 0 && (
                <CommandGroup heading="All Currencies">
                  {otherCurrencies.map((currency) => (
                    <CommandItem
                      key={currency.code}
                      value={`${currency.code} ${currency.name} ${currency.symbol}`}
                      onSelect={() => {
                        onChange(currency.code);
                        setOpen(false);
                        setSearch('');
                      }}
                      className="flex items-center gap-3"
                    >
                      <span className="font-medium w-10">{currency.code}</span>
                      <span className="w-6 text-center">{currency.symbol}</span>
                      <span className="text-muted-foreground flex-1">{currency.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}