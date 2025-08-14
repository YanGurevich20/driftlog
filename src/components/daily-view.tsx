'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency, formatCurrencyWithSign } from '@/lib/currency-utils';
import { useEntries } from '@/hooks/use-entries';
import { useSpace } from '@/hooks/use-space';
import { ArrowUp, ArrowDown, ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay, endOfDay, addDays, subDays, isAfter, isBefore, isToday, isSameYear } from 'date-fns';
import type { Entry } from '@/types';

export function DailyView() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  
  const startOfSelectedDay = startOfDay(selectedDate);
  const endOfSelectedDay = endOfDay(selectedDate);
  
  const { entries, loading } = useEntries({
    spaceId: user?.defaultSpaceId,
    startDate: startOfSelectedDay,
    endDate: endOfSelectedDay,
  });
  
  const { space } = useSpace(user?.defaultSpaceId);
  const spaceBaseCurrency = space?.baseCurrency || 'USD';

  const groupedEntries = entries.reduce((acc, entry) => {
    const category = entry.category;
    if (!acc[category]) {
      acc[category] = {
        entries: [],
        total: 0,
        type: entry.type,
      };
    }
    acc[category].entries.push(entry);
    const amount = entry.convertedAmount || entry.amount;
    acc[category].total += amount;
    return acc;
  }, {} as Record<string, { entries: Entry[]; total: number; type: 'income' | 'expense' }>);

  const dailyNet = Object.values(groupedEntries).reduce((sum, group) => {
    return sum + (group.type === 'income' ? group.total : -group.total);
  }, 0);

  const handlePreviousDay = () => {
    setSelectedDate(subDays(selectedDate, 1));
  };

  const handleNextDay = () => {
    setSelectedDate(addDays(selectedDate, 1));
  };

  const canGoNext = !isToday(selectedDate) && !isAfter(selectedDate, new Date());
  
  const firstEntry = entries.length > 0 ? entries[entries.length - 1] : null;
  const canGoPrevious = firstEntry ? isBefore(subDays(selectedDate, 1), firstEntry.date) : true;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-10 bg-muted/50 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePreviousDay}
            disabled={!canGoPrevious}
            className="size-8"
          >
            <ChevronLeftIcon />
          </Button>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {isSameYear(selectedDate, new Date()) 
                  ? format(selectedDate, 'EEEE, MMMM d')
                  : format(selectedDate, 'PPP')
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                disabled={(date) => isAfter(date, new Date())}
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextDay}
            disabled={!canGoNext}
            className="size-8"
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {Object.keys(groupedEntries).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No entries for this day
          </div>
        ) : (
          <Accordion 
            type="multiple" 
            value={openCategories}
            onValueChange={setOpenCategories}
            className="space-y-2"
          >
            {Object.entries(groupedEntries).map(([category, group]) => (
              <AccordionItem key={category} value={category} className="border rounded-lg">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-full bg-muted">
                        {group.type === 'income' ? (
                          <ArrowUp className="h-3 w-3 text-primary" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )}
                      </div>
                      <span className="font-medium">{category}</span>
                    </div>
                    <span className={`font-semibold ${
                      group.type === 'income' ? 'text-primary' : ''
                    }`}>
                      {formatCurrencyWithSign(
                        group.total,
                        spaceBaseCurrency,
                        group.type === 'expense'
                      )}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-3">
                  <div className="space-y-2 pt-2">
                    {group.entries.map((entry) => (
                      <div key={entry.id} className="flex justify-between items-start pl-7 text-sm">
                        <span className="text-muted-foreground">
                          {entry.description || 'No description'}
                        </span>
                        <span className={group.type === 'income' ? 'text-primary' : ''}>
                          {formatCurrency(entry.amount, entry.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>

      {Object.keys(groupedEntries).length > 0 && (
        <>
          <Separator />
          <CardFooter className="pt-4">
            <div className="flex justify-between w-full">
              <span className="font-medium">Daily Net</span>
              <span className={`text-lg font-bold ${dailyNet >= 0 ? 'text-primary' : ''}`}>
                {formatCurrencyWithSign(Math.abs(dailyNet), spaceBaseCurrency, dailyNet < 0)}
              </span>
            </div>
          </CardFooter>
        </>
      )}
    </Card>
  );
}