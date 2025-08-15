'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency } from '@/lib/currency-utils';
import { useEntries } from '@/hooks/use-entries';
import { useSpaceCurrency } from '@/hooks/use-space-currency';
import { ArrowUp, ArrowDown, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { addDays, subDays, isAfter, isBefore, isToday } from 'date-fns';
import { getDateRangeForDay } from '@/lib/date-range-utils';
import type { Entry } from '@/types';
import { DataState } from '@/components/ui/data-state';
import { DateNavigation } from '@/components/ui/date-navigation';
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
  
  const { entries, loading, error } = useEntries({
    spaceId: user?.defaultSpaceId,
    startDate: dateRange.start,
    endDate: dateRange.end,
  });
  
  const { currency: spaceBaseCurrency } = useSpaceCurrency(user?.defaultSpaceId);

  const groupedEntries = entries.reduce((acc, entry) => {
    const category = entry.category;
    if (!acc[category]) {
      acc[category] = {
        entries: [],
        net: 0,
      };
    }
    acc[category].entries.push(entry);
    const amount = entry.convertedAmount || entry.amount;
    // Add as positive for income, negative for expense
    acc[category].net += entry.type === 'income' ? amount : -amount;
    return acc;
  }, {} as Record<string, { entries: Entry[]; net: number }>);

  const dailyNet = Object.values(groupedEntries).reduce((sum, group) => {
    return sum + group.net;
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
        <h2 className="text-lg font-semibold mb-4 text-primary">Daily View</h2>
        <DateNavigation
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onPrevious={handlePreviousDay}
          onNext={handleNextDay}
          canGoPrevious={canGoPrevious}
          canGoNext={canGoNext}
          mode="day"
          disabled={(date) => isAfter(date, new Date())}
        />
      </CardHeader>
      
      <CardContent>
        <DataState
          loading={loading}
          error={error}
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
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-full bg-muted">
                        {group.net >= 0 ? (
                          <ArrowUp className="h-3 w-3 text-primary" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )}
                      </div>
                      <span className="font-medium">{category}</span>
                    </div>
                    <span className={`font-semibold ${
                      group.net >= 0 ? 'text-primary' : ''
                    }`}>
                      {formatCurrency(
                        Math.abs(group.net),
                        spaceBaseCurrency,
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
                          {entry.description || entry.date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm whitespace-nowrap ${entry.type === 'income' ? 'text-primary' : ''}`}>
                            {formatCurrency(entry.amount, entry.currency, entry.type === 'expense')}
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
          <Separator />
          <CardFooter className="pt-4">
            <div className="flex justify-between w-full">
              <span className="font-medium">Daily Net</span>
              <span className={`text-lg font-bold ${dailyNet >= 0 ? 'text-primary' : ''}`}>
                {formatCurrency(Math.abs(dailyNet), spaceBaseCurrency, dailyNet < 0)}
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