'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency, convertAmount } from '@/lib/currency-utils';
import { useEntries } from '@/hooks/use-entries';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import { 
  CollapsibleCard, 
  CollapsibleCardContent, 
  CollapsibleCardFooter, 
  CollapsibleCardHeader, 
  CollapsibleCardTitle 
} from '@/components/ui/collapsible-card';
import { MonthPicker } from '@/components/ui/month-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon, MoreVertical, Edit2, Trash2, Repeat, Repeat1 } from 'lucide-react';
import { DataState } from '@/components/ui/data-state';
import { format } from 'date-fns';
import { Receipt } from 'lucide-react';
import { getDateRangeForMonth } from '@/lib/date-range-utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { Entry } from '@/types';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function MonthlyView() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<Entry | null>(null);
  
  const dateRange = getDateRangeForMonth(selectedMonth);
  
  const { entries, loading: entriesLoading, error: entriesError } = useEntries({
    startDate: dateRange.start,
    endDate: dateRange.end,
  });
  
  const displayCurrency = user?.displayCurrency || 'USD';
  const { ratesByMonth, error: ratesError, loading: ratesLoading } = useExchangeRates({
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

  const groupedEntries = useMemo(() => {
    if (ratesLoading || !ratesByMonth) {
      return {} as Record<string, { entries: Entry[]; net: number }>;
    }
    return entries.reduce((acc, entry) => {
      const category = entry.category;
      if (!acc[category]) {
        acc[category] = {
          entries: [],
          net: 0,
        };
      }
      acc[category].entries.push(entry);
      const amount = convertAmount(
        entry.originalAmount,
        entry.currency,
        displayCurrency,
        entry.date,
        ratesByMonth
      );
      acc[category].net += entry.type === 'income' ? amount : -amount;
      return acc;
    }, {} as Record<string, { entries: Entry[]; net: number }>);
  }, [entries, ratesByMonth, ratesLoading, displayCurrency]);

  const monthlyNet = useMemo(() => {
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
    } catch (error) {
      console.error('Failed to delete:', error);
      toast.error('Failed to delete entry');
    }
  };


  return (
    <>
    <CollapsibleCard defaultCollapsed={true}>
      <CollapsibleCardHeader
        actions={
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon">
                <CalendarIcon />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <MonthPicker
                currentMonth={selectedMonth}
                onMonthChange={setSelectedMonth}
              />
            </PopoverContent>
          </Popover>
        }
      >
        <CollapsibleCardTitle className="text-primary">
          {format(selectedMonth, 'MMMM yyyy')}
        </CollapsibleCardTitle>
      </CollapsibleCardHeader>
      
      <CollapsibleCardContent>
        <DataState
          loading={entriesLoading || ratesLoading}
          error={entriesError || ratesError}
          empty={Object.keys(groupedEntries).length === 0}
          loadingVariant="skeleton"
          emptyTitle="No entries for this month"
          emptyDescription="Add your first entry for this month"
          emptyIcon={Receipt}
        >
          <Accordion 
            type="multiple" 
            value={openCategories}
            onValueChange={setOpenCategories}
          >
            {Object.entries(groupedEntries)
              .sort(([, a], [, b]) => a.net - b.net)
              .map(([category, group]) => (
              <AccordionItem key={category} value={category}>
                <AccordionTrigger>
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
                    {group.entries
                      .sort((a, b) => {
                        const aAmount = a.type === 'income' ? a.originalAmount : -a.originalAmount;
                        const bAmount = b.type === 'income' ? b.originalAmount : -b.originalAmount;
                        return aAmount - bAmount;
                      })
                      .map((entry) => (
                      <div key={entry.id} className="flex justify-between items-start gap-2 pl-10 pr-1">
                        <div className="flex items-center gap-1">
                          {entry.isRecurringInstance && (
                            entry.isModified ? (
                              <Repeat1 className="h-3 w-3 text-muted-foreground" />
                            ) : (
                              <Repeat className="h-3 w-3 text-muted-foreground" />
                            )
                          )}
                          <span className="text-muted-foreground text-sm">
                            {entry.description || 'No description'}
                          </span>
                        </div>
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
      </CollapsibleCardContent>

      {Object.keys(groupedEntries).length > 0 && (
        <>
          <CollapsibleCardFooter>
            <div className="flex justify-between w-full">
              <span className="font-medium">Monthly Net</span>
              <span className={`text-lg font-bold ${monthlyNet >= 0 ? 'text-primary' : ''}`}>
                {formatCurrency(Math.abs(monthlyNet), displayCurrency, monthlyNet < 0)}
              </span>
            </div>
          </CollapsibleCardFooter>
        </>
      )}
    </CollapsibleCard>

    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Entry</AlertDialogTitle>
          <AlertDialogDescription>
            {entryToDelete?.recurringTemplateId ? (
              'This is a recurring entry. What would you like to do?'
            ) : (
              'Are you sure you want to delete this entry? This action cannot be undone.'
            )}
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