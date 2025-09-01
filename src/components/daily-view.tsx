'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency, convertAmount } from '@/lib/currency-utils';
import { useEntries } from '@/hooks/use-entries';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import { MoreVertical, Edit2, Trash2, CalendarIcon, Repeat, Repeat1 } from 'lucide-react';
import { 
  CollapsibleCard, 
  CollapsibleCardContent, 
  CollapsibleCardFooter, 
  CollapsibleCardHeader, 
  CollapsibleCardTitle 
} from '@/components/ui/collapsible-card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { format } from 'date-fns';
import { getDateRangeForDay } from '@/lib/date-range-utils';
import type { Entry } from '@/types';
import { cn } from '@/lib/utils';
import { CategoryIcon } from '@/components/ui/category-icon';
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
import { SERVICE_START_DATE } from '@/lib/config';
import { TypingText } from '@/components/ui/typing-text';

interface DailyViewProps {
  selectedDate?: Date;
  onDateChange?: (date: Date) => void;
  animatingEntryId?: string;
  onAnimationComplete?: () => void;
}

export function DailyView({ selectedDate: propSelectedDate, onDateChange, animatingEntryId, onAnimationComplete }: DailyViewProps = {}) {
  const { user } = useAuth();
  const router = useRouter();
  const [internalSelectedDate, setInternalSelectedDate] = useState(() => {
    // Check if there's a date stored in sessionStorage from toast action
    if (typeof window !== 'undefined') {
      const storedDate = sessionStorage.getItem('dailyViewDate');
      if (storedDate) {
        sessionStorage.removeItem('dailyViewDate'); // Clear it after using
        return new Date(storedDate);
      }
    }
    return new Date();
  });

  // Use prop if provided, otherwise use internal state
  const selectedDate = propSelectedDate || internalSelectedDate;
  const setSelectedDate = onDateChange || setInternalSelectedDate;
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<Entry | null>(null);
  
  const dateRange = getDateRangeForDay(selectedDate);
  
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
      // Convert to display currency using the entry's date
      const amount = convertAmount(
        entry.originalAmount,
        entry.currency,
        displayCurrency,
        entry.date,
        ratesByMonth
      );
      // Add as positive for income, negative for expense
      acc[category].net += entry.type === 'income' ? amount : -amount;
      return acc;
    }, {} as Record<string, { entries: Entry[]; net: number }>);
  }, [entries, ratesByMonth, ratesLoading, displayCurrency]);

  const dailyNet = useMemo(() => {
    return Object.values(groupedEntries).reduce((sum, group) => {
      return sum + group.net;
    }, 0);
  }, [groupedEntries]);

  // Open all categories by default
  useEffect(() => {
    setOpenCategories(Object.keys(groupedEntries));
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
    <CollapsibleCard>
      <CollapsibleCardHeader
        actions={
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
                disabled={{ before: SERVICE_START_DATE }}
                startMonth={SERVICE_START_DATE}
              />
            </PopoverContent>
          </Popover>
        }
      >
        <CollapsibleCardTitle>
          {format(selectedDate, 'EEEE, MMMM d')}
        </CollapsibleCardTitle>
      </CollapsibleCardHeader>
      
      <CollapsibleCardContent>
        <DataState
          loading={entriesLoading || ratesLoading}
          error={entriesError || ratesError}
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
            {Object.entries(groupedEntries)
              .sort(([, a], [, b]) => a.net - b.net)
              .map(([category, group]) => (
              <AccordionItem key={category} value={category}>
                <AccordionTrigger className={cn(
                  // "hover:no-underline",
                  // index === 0 && "pt-0",
                  // index === array.length - 1 && !openCategories.includes(category) && "pb-0"
                )}>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <CategoryIcon category={category} />
                      <span className="font-medium">{category}</span>
                    </div>
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
                  <div className="space-y-2 pt-1">
                    {group.entries
                      .sort((a, b) => {
                        const aAmount = a.type === 'income' ? a.originalAmount : -a.originalAmount;
                        const bAmount = b.type === 'income' ? b.originalAmount : -b.originalAmount;
                        return aAmount - bAmount;
                      })
                      .map((entry) => {
                        const isRecent = entry.createdAt && 
                          (Date.now() - entry.createdAt.getTime()) < 5 * 60 * 1000; // 5 minutes
                        const shouldAnimate = animatingEntryId === entry.id;
                        return (
                      <div key={entry.id} className="flex justify-between items-start">
                        <div className="flex items-center gap-1">
                          {entry.isRecurringInstance && (
                            entry.isModified ? (
                              <Repeat1 className="h-3 w-3 text-muted-foreground" />
                            ) : (
                              <Repeat className="h-3 w-3 text-muted-foreground" />
                            )
                          )}
                          {shouldAnimate ? (
                            <TypingText
                              text={`${entry.description || 'No description'} ${isRecent ? '•' : ''}`}
                              delay={70}
                              repeat={false}
                              hideCursorOnComplete={true}
                              className="text-muted-foreground text-sm"
                              grow={true}
                              onComplete={onAnimationComplete}
                            />
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              {`${entry.description || 'No description'} ${isRecent ? '•' : ''}`}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-sm whitespace-nowrap",
                            entry.type === 'income' ? 'text-primary' : ''
                          )}>
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
                    )})}
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
              <span className="font-medium">Daily Net</span>
              <span className={`text-lg font-bold ${dailyNet >= 0 ? 'text-primary' : ''}`}>
                {formatCurrency(Math.abs(dailyNet), displayCurrency, dailyNet < 0)}
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