'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency } from '@/lib/currency-utils';
import { useEntries } from '@/hooks/use-entries';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import { MoreVertical, Edit2, Trash2, CalendarIcon } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { format } from 'date-fns';
import { getDateRangeForDay } from '@/lib/date-range-utils';
import type { Entry } from '@/types';
import { cn } from '@/lib/utils';
import { DataState } from '@/components/ui/data-state';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarDays } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { deleteEntry } from '@/services/entries';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function DailyView() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<Entry | null>(null);
  
  const dateRange = getDateRangeForDay(selectedDate);
  
  const { entries, loading: entriesLoading, error: entriesError } = useEntries({
    startDate: dateRange.start,
    endDate: dateRange.end,
  });
  
  const displayCurrency = user?.displayCurrency || 'USD';
  const { convert, error: conversionError, loading: ratesLoading } = useExchangeRates({
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

  const groupedEntries = useMemo(() => {
    return entries.reduce((acc, entry) => {
      const category = entry.category;
      if (!acc[category]) {
        acc[category] = {
          entries: [],
          net: 0,
        };
      }
      acc[category].entries.push(entry);
      // Convert to display currency using the entry's date
      const amount = convert(
        entry.originalAmount,
        entry.currency,
        displayCurrency,
        entry.date
      );
      // Add as positive for income, negative for expense
      acc[category].net += entry.type === 'income' ? amount : -amount;
      return acc;
    }, {} as Record<string, { entries: Entry[]; net: number }>);
  }, [entries, convert, displayCurrency]);

  const dailyNet = useMemo(() => {
    return Object.values(groupedEntries).reduce((sum, group) => {
      return sum + group.net;
    }, 0);
  }, [groupedEntries]);

  const handleEdit = (entry: Entry) => {
    router.push(`/dashboard/entry/${entry.id}`);
  };

  const handleDelete = async () => {
    if (!entryToDelete) return;
    
    try {
      await deleteEntry(entryToDelete.id);
      toast.success('Entry deleted');
      setDeleteDialogOpen(false);
      setEntryToDelete(null);
    } catch {
      toast.error('Failed to delete entry');
    }
  };


  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between w-full">
          <CardTitle className="text-primary">
            {format(selectedDate, 'EEEE, MMMM d')}
          </CardTitle>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon">
                <CalendarIcon />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
              />
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      
      <CardContent>
        <DataState
          loading={entriesLoading || ratesLoading}
          error={entriesError || conversionError}
          empty={Object.keys(groupedEntries).length === 0}
          loadingVariant="skeleton"
          emptyTitle="No entries for this day"
          emptyDescription="Add your first entry for this date"
          emptyIcon={CalendarDays}
        >
          <Accordion 
            type="multiple" 
            value={openCategories}
            onValueChange={setOpenCategories}
          >
            {Object.entries(groupedEntries).map(([category, group]) => (
              <AccordionItem key={category} value={category}>
                <AccordionTrigger className={cn(
                  // "hover:no-underline",
                  // index === 0 && "pt-0",
                  // index === array.length - 1 && !openCategories.includes(category) && "pb-0"
                )}>
                  <div className="flex items-center justify-between w-full pr-2">
                    <span className="font-medium">{category}</span>
                    <span className={`font-semibold ${
                      group.net >= 0 ? 'text-primary' : ''
                    }`}>
                      {formatCurrency(
                        Math.abs(group.net),
                        displayCurrency,
                        group.net < 0
                      )}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2.5 pt-1">
                    {group.entries.map((entry) => (
                      <div key={entry.id} className="flex justify-between items-start gap-2 pl-10 pr-1">
                        <span className="text-muted-foreground text-sm">
                          {entry.description || 'No description'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm whitespace-nowrap ${entry.type === 'income' ? 'text-primary' : ''}`}>
                            {formatCurrency(entry.originalAmount, entry.currency, entry.type === 'expense')}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(entry)}>
                                <Edit2 className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEntryToDelete(entry);
                                  setDeleteDialogOpen(true);
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </DataState>
      </CardContent>

      {Object.keys(groupedEntries).length > 0 && (
        <>
          <CardFooter className="pt-4">
            <div className="flex justify-between w-full">
              <span className="font-medium">Daily Net</span>
              <span className={`text-lg font-bold ${dailyNet >= 0 ? 'text-primary' : ''}`}>
                {formatCurrency(Math.abs(dailyNet), displayCurrency, dailyNet < 0)}
              </span>
            </div>
          </CardFooter>
        </>
      )}
    </Card>

    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Entry</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this entry? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setEntryToDelete(null)}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}