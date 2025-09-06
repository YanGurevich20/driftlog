'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency, convertAmount } from '@/lib/currency-utils';
import { useEntries } from '@/hooks/use-entries';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import { Edit2, Trash2, CalendarIcon, Repeat, Repeat1, Check, X } from 'lucide-react';
import {
  CollapsibleCard,
  CollapsibleCardContent,
  CollapsibleCardFooter,
  CollapsibleCardHeader,
  CollapsibleCardTitle
} from '@/components/ui/collapsible-card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { format } from 'date-fns';
import type { Entry } from '@/types';
import { cn } from '@/lib/utils';
import { CategoryIcon } from '@/components/ui/category-icon';
import { DataState } from '@/components/ui/data-state';
import { Calendar } from '@/components/ui/calendar';
import { MonthPicker } from '@/components/ui/month-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { EntryEditDialog } from '@/components/entry-edit-dialog';
import { deleteEntry, updateEntry } from '@/services/entries';
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
import { TypingText } from '@/components/ui/typing-text';
import { CalendarDays, Receipt } from 'lucide-react';
import { SERVICE_START_DATE } from '@/lib/config';
import { getDateRangeForDay, getDateRangeForMonth } from '@/lib/date-range-utils';
import { useIsDesktop } from '@/hooks/use-media-query';
import { CategorySelector } from '@/components/category-selector';
import { CurrencySelector } from '@/components/currency-selector';
import { Input } from '@/components/ui/input';

interface EntriesViewProps {
  mode: 'daily' | 'monthly';
  selectedDate?: Date;
  onDateChange?: (date: Date) => void;
  animatingEntryId?: string;
  onAnimationComplete?: () => void;
}

export function EntriesView({
  mode,
  selectedDate: propSelectedDate,
  onDateChange,
  animatingEntryId,
  onAnimationComplete
}: EntriesViewProps) {
  const { user } = useAuth();
  const isDesktop = useIsDesktop();
  // Mode-specific configuration
  const isDaily = mode === 'daily';
  const dateRangeFunction = isDaily ? getDateRangeForDay : getDateRangeForMonth;
  const dateFormat = isDaily ? 'EEEE, MMMM d' : 'MMMM yyyy';
  const sessionStorageKey = isDaily ? 'dailyViewDate' : undefined;
  const emptyTitle = isDaily ? 'No entries for this day' : 'No entries for this month';
  const emptyDescription = isDaily
    ? 'Add your first entry for this date'
    : 'Add your first entry for this month';
  const emptyIcon = isDaily ? CalendarDays : Receipt;

  const [internalSelectedDate, setInternalSelectedDate] = useState(() => {
    // Check if there's a date stored in sessionStorage (daily mode only)
    if (sessionStorageKey && typeof window !== 'undefined') {
      const storedDate = sessionStorage.getItem(sessionStorageKey);
      if (storedDate) {
        sessionStorage.removeItem(sessionStorageKey);
        return new Date(storedDate);
      }
    }
    return new Date();
  });

  // Use prop if provided, otherwise use internal state
  const selectedDate = propSelectedDate || internalSelectedDate;
  const setSelectedDate = onDateChange || setInternalSelectedDate;

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<Entry | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<Entry | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForms, setEditForms] = useState<Record<string, {
    amount: string;
    currency: string;
    category: string;
    description: string;
  }>>({});

  const dateRange = dateRangeFunction(selectedDate);

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
      return {} as Record<string, { entries: Entry[]; income: number; expenses: number }>;
    }
    return entries.reduce((acc, entry) => {
      const category = entry.category;
      if (!acc[category]) {
        acc[category] = {
          entries: [],
          income: 0,
          expenses: 0,
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
      // Add to appropriate category
      if (entry.type === 'income') {
        acc[category].income += amount;
      } else {
        acc[category].expenses += amount;
      }
      return acc;
    }, {} as Record<string, { entries: Entry[]; income: number; expenses: number }>);
  }, [entries, ratesByMonth, ratesLoading, displayCurrency]);

  const totalAmounts = useMemo(() => {
    return Object.values(groupedEntries).reduce((acc, group) => {
      return {
        income: acc.income + group.income,
        expenses: acc.expenses + group.expenses,
      };
    }, { income: 0, expenses: 0 });
  }, [groupedEntries]);

  const handleEdit = (entry: Entry) => {
    setEntryToEdit(entry);
    setEditDialogOpen(true);
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

  const enterEditMode = () => {
    // Initialize edit forms for all entries currently loaded
    const forms: Record<string, { amount: string; currency: string; category: string; description: string }> = {};
    entries.forEach((e) => {
      forms[e.id] = {
        amount: e.originalAmount.toString(),
        currency: e.currency,
        category: e.category,
        description: e.description || ''
      };
    });
    setEditForms(forms);
    setIsEditMode(true);
  };

  const exitEditMode = () => {
    setIsEditMode(false);
    setEditForms({});
  };

  const updateEditForm = (id: string, field: keyof typeof editForms[string], value: string) => {
    setEditForms((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const saveAllEdits = async () => {
    if (!user) return;
    try {
      // Validate amounts
      const invalid = Object.values(editForms).some((f) => {
        const amount = f.amount.trim();
        return !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0 || !f.category;
      });
      if (invalid) {
        toast.error('Please enter valid amounts and categories for all edits');
        return;
      }

      const entryById = new Map(entries.map((e) => [e.id, e]));
      const updates = Object.entries(editForms)
        .map(([id, form]) => {
          const original = entryById.get(id);
          if (!original) return null;
          const amountNum = parseFloat(form.amount);
          const changed = (
            amountNum !== original.originalAmount ||
            form.currency !== original.currency ||
            form.category !== original.category ||
            (form.description || '') !== (original.description || '')
          );
          if (!changed) return null;
          return updateEntry(id, {
            originalAmount: amountNum,
            currency: form.currency,
            category: form.category,
            description: form.description || '',
            isModified: true,
          }, user.id);
        })
        .filter(Boolean) as Promise<void>[];

      if (updates.length === 0) {
        toast.message('No changes to save');
        exitEditMode();
        return;
      }

      await Promise.all(updates);
      toast.success('Entries updated');
      exitEditMode();
    } catch (error) {
      console.error('Failed to update entries:', error);
      toast.error('Failed to update entries');
    }
  };



    return (
    <>
    <CollapsibleCard defaultCollapsed={!isDaily} hideFooterWhenCollapsed={!isDesktop}>
      <CollapsibleCardHeader
        actions={
          <div className="flex gap-1">
            {isEditMode ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={saveAllEdits}
                  className="text-primary hover:text-primary"
                >
                  <Check />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={exitEditMode}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={enterEditMode}
                  disabled={entries.length === 0}
                >
                  <Edit2 />
                </Button>
              </>
            )}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon">
                  <CalendarIcon />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                {isDaily ? (
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    disabled={{ before: SERVICE_START_DATE }}
                    startMonth={SERVICE_START_DATE}
                  />
                ) : (
                  <MonthPicker
                    currentMonth={selectedDate}
                    onMonthChange={setSelectedDate}
                  />
                )}
              </PopoverContent>
            </Popover>
          </div>
        }
      >
        <CollapsibleCardTitle>
          {format(selectedDate, dateFormat)}
        </CollapsibleCardTitle>
      </CollapsibleCardHeader>

      <CollapsibleCardContent>
        <DataState
          loading={entriesLoading || ratesLoading}
          error={entriesError || ratesError}
          empty={Object.keys(groupedEntries).length === 0}
          loadingVariant="skeleton"
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
          emptyIcon={emptyIcon}
        >
            <Accordion
              type="multiple"
              defaultValue={isDaily ? Object.keys(groupedEntries) : []}
            >
              {Object.entries(groupedEntries)
                .sort(([, a], [, b]) => (a.income - a.expenses) - (b.income - b.expenses))
                .map(([category, group]) => (
                  <AccordionItem key={category} value={category}>
                    <AccordionTrigger>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <CategoryIcon category={category} />
                          <span className="font-medium">{category}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          {group.income > 0 && (
                            <span className="text-primary font-semibold">
                              {formatCurrency(group.income, displayCurrency, false)}
                            </span>
                          )}
                          {group.expenses > 0 && (
                            <span className="font-semibold">
                              {formatCurrency(group.expenses, displayCurrency, true)}
                            </span>
                          )}
                        </div>
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
                            const form = editForms[entry.id] || {
                              amount: entry.originalAmount.toString(),
                              currency: entry.currency,
                              category: entry.category,
                              description: entry.description || ''
                            };
                            return (
                              <div key={entry.id} className="flex justify-between items-center gap-2">
                                {isEditMode ? (
                                  <div className="flex items-center gap-2 flex-1">
                                    {entry.isRecurringInstance && (
                                      entry.isModified ? (
                                        <Repeat1 className="h-3 w-3 text-muted-foreground" />
                                      ) : (
                                        <Repeat className="h-3 w-3 text-muted-foreground" />
                                      )
                                    )}
                                    <CategorySelector
                                      value={form.category}
                                      onChange={(val) => updateEditForm(entry.id, 'category', val)}
                                      type={entry.type}
                                    />
                                    <Input
                                      type="text"
                                      placeholder="Add a note..."
                                      defaultValue={form.description}
                                      onChange={(e) => updateEditForm(entry.id, 'description', e.target.value)}
                                      className="flex-1 h-8"
                                    />
                                  </div>
                                ) : (
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
                                )}
                                {isEditMode ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      defaultValue={form.amount}
                                      onChange={(e) => updateEditForm(entry.id, 'amount', e.target.value)}
                                      className="w-24 h-8"
                                    />
                                    <CurrencySelector
                                      value={form.currency}
                                      onChange={(val) => updateEditForm(entry.id, 'currency', val)}
                                    />
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={() => {
                                        setEntryToDelete(entry);
                                        setDeleteDialogOpen(true);
                                      }}
                                    >
                                      <Trash2 />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className={cn(
                                      "text-sm whitespace-nowrap",
                                      entry.type === 'income' ? 'text-primary' : ''
                                    )}>
                                      {formatCurrency(entry.originalAmount, entry.currency, entry.type === 'expense')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
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
              <div className="space-y-2 w-full">
                {totalAmounts.income > 0 && (
                  <div className="flex justify-between">
                    <span className="font-medium">{isDaily ? 'Daily' : 'Monthly'} Income</span>
                    <span className="text-lg font-bold text-primary">
                      {formatCurrency(totalAmounts.income, displayCurrency, false, true)}
                    </span>
                  </div>
                )}
                {totalAmounts.expenses > 0 && (
                  <div className="flex justify-between">
                    <span className="font-medium">{isDaily ? 'Daily' : 'Monthly'} Expenses</span>
                    <span className="text-lg font-bold">
                      {formatCurrency(totalAmounts.expenses, displayCurrency, true)}
                    </span>
                  </div>
                )}
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
                Are you sure you want to delete this entry?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEntryToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          {entryToEdit && (
            <EntryEditDialog
              entry={entryToEdit}
              onSuccess={() => {
                setEditDialogOpen(false);
                setEntryToEdit(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
