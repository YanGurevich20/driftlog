'use client';

import { useState, useMemo, useEffect } from 'react';
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
// import { cn } from '@/lib/utils';
import { CategoryIcon } from '@/components/ui/category-icon';
import { DataState } from '@/components/ui/data-state';
import { Calendar } from '@/components/ui/calendar';
import { MonthPicker } from '@/components/ui/month-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { deleteEntry, updateEntry } from '@/services/entries';
import { toast } from 'sonner';
 
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

type EditForm = {
  amount: string;
  currency: string;
  category: string;
  description: string;
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
  const [cardCollapsed, setCardCollapsed] = useState(!isDaily);
  const [openCategories, setOpenCategories] = useState<string[]>([]);
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

  const [isEditMode, setIsEditMode] = useState(false);
  const [editForms, setEditForms] = useState<Record<string, EditForm>>({});
  const [stagedDeleteIds, setStagedDeleteIds] = useState<Set<string>>(new Set());
  const [frozenCategoryOrder, setFrozenCategoryOrder] = useState<string[] | null>(null);
  const [entryErrors, setEntryErrors] = useState<Record<string, { amount: boolean; category: boolean }>>({});

  const renderRecurringIcon = (entry: Entry) => (
    entry.isRecurringInstance ? (
      entry.isModified ? (
        <Repeat1 className="h-3 w-3 text-muted-foreground" />
      ) : (
        <Repeat className="h-3 w-3 text-muted-foreground" />
      )
    ) : null
  );

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
  const ratesReady = !!ratesByMonth && !ratesLoading;

  const effectiveEntries = useMemo(() => (
    isEditMode && stagedDeleteIds.size > 0
      ? entries.filter(e => !stagedDeleteIds.has(e.id))
      : entries
  ), [entries, isEditMode, stagedDeleteIds]);

  const groupedEntries = useMemo(() => {
    if (!ratesReady) return {} as Record<string, { entries: Entry[]; income: number; expenses: number }>;
    return effectiveEntries.reduce((acc, entry) => {
      const category = entry.category;
      if (!acc[category]) acc[category] = { entries: [], income: 0, expenses: 0 };
      acc[category].entries.push(entry);
      let amount = 0;
      try {
        amount = convertAmount(entry.originalAmount, entry.currency, displayCurrency, entry.date, ratesByMonth);
      } catch {
        console.warn('Skipping unsupported currency conversion', entry.currency, '->', displayCurrency, 'for entry', entry.id);
        amount = 0;
      }
      if (entry.type === 'income') acc[category].income += amount; else acc[category].expenses += amount;
      return acc;
    }, {} as Record<string, { entries: Entry[]; income: number; expenses: number }>);
  }, [effectiveEntries, ratesByMonth, ratesReady, displayCurrency]);

  const totalAmounts = useMemo(() => {
    return Object.values(groupedEntries).reduce((acc, group) => {
      return {
        income: acc.income + group.income,
        expenses: acc.expenses + group.expenses,
      };
    }, { income: 0, expenses: 0 });
  }, [groupedEntries]);

  const compareNet = ([, a]: [string, { income: number; expenses: number }], [, b]: [string, { income: number; expenses: number }]) =>
    (a.income - a.expenses) - (b.income - b.expenses);
  const categoryKeys = useMemo(() => {
    const entriesArray = Object.entries(groupedEntries);
    if (!isEditMode || !frozenCategoryOrder || frozenCategoryOrder.length === 0) {
      return entriesArray.sort(compareNet).map(([category]) => category);
    }
    const frozen = frozenCategoryOrder.filter((c) => groupedEntries[c]);
    const extras = entriesArray.filter(([c]) => !frozenCategoryOrder.includes(c)).sort(compareNet).map(([c]) => c);
    return [...frozen, ...extras];
  }, [groupedEntries, isEditMode, frozenCategoryOrder]);

  useEffect(() => {
    const valid = new Set(categoryKeys);
    setOpenCategories((prev) => prev.filter((c) => valid.has(c)));
  }, [categoryKeys]);

  useEffect(() => {
    if (!animatingEntryId) return;
    setCardCollapsed(false);
    const entry = effectiveEntries.find((e) => e.id === animatingEntryId);
    if (entry) {
      setOpenCategories((prev) => (prev.includes(entry.category) ? prev : [...prev, entry.category]));
    }
  }, [animatingEntryId, effectiveEntries]);

  

  const enterEditMode = () => {
    // Initialize edit forms for all entries currently loaded
    const forms: Record<string, EditForm> = {};
    entries.forEach((e) => {
      forms[e.id] = {
        amount: e.originalAmount.toString(),
        currency: e.currency,
        category: e.category,
        description: e.description || ''
      };
    });
    setEditForms(forms);
    setStagedDeleteIds(new Set());
    // Freeze current category order based on the current sort
    const currentOrder = Object.entries(groupedEntries).sort(compareNet).map(([category]) => category);
    setFrozenCategoryOrder(currentOrder);
    setIsEditMode(true);
    setCardCollapsed(false);
    setEntryErrors({});
  };

  const exitEditMode = () => {
    setIsEditMode(false);
    setEditForms({});
    setStagedDeleteIds(new Set());
    setFrozenCategoryOrder(null);
    setEntryErrors({});
  };

  const updateEditForm = (id: string, field: keyof EditForm, value: string) => {
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
      // Validate on submit only and mark specific fields
      const nextErrors: Record<string, { amount: boolean; category: boolean }> = {};
      for (const [id, f] of Object.entries(editForms)) {
        if (stagedDeleteIds.has(id)) continue;
        const amountStr = (f.amount || '').trim();
        const amountInvalid = !amountStr || isNaN(parseFloat(amountStr)) || parseFloat(amountStr) <= 0;
        const categoryInvalid = !f.category;
        if (amountInvalid || categoryInvalid) {
          nextErrors[id] = { amount: amountInvalid, category: categoryInvalid };
        }
      }
      setEntryErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) {
        return;
      }

      const entryById = new Map(entries.map((e) => [e.id, e]));
      const updates = Object.entries(editForms)
        .map(([id, form]) => {
          if (stagedDeleteIds.has(id)) return null;
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

      const deletes = Array.from(stagedDeleteIds).map((id) => deleteEntry(id));

      const ops = [...updates, ...deletes];

      if (ops.length === 0) {
        toast.info('No changes made');
        exitEditMode();
        return;
      }

      await Promise.all(ops);
      toast.success('Entries updated');
      exitEditMode();
    } catch (error) {
      console.error('Failed to update entries:', error);
      toast.error('Failed to update entries');
    }
  };



    return (
    <>
    <CollapsibleCard
      defaultCollapsed={!isDaily}
      collapsed={cardCollapsed}
      setCollapsed={setCardCollapsed}
      hideFooterWhenCollapsed={!isDesktop}
    >
      <CollapsibleCardHeader
        actions={
          <div className="flex gap-1">
            {isEditMode ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={saveAllEdits}
                >
                  <Check />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={exitEditMode}
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
                <Button variant="ghost" size="icon" onClick={() => setCardCollapsed(false)}>
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
              value={openCategories}
              onValueChange={(vals) => setOpenCategories(Array.isArray(vals) ? vals : [])}
            >
              {categoryKeys
                .map((category) => {
                  const group = groupedEntries[category];
                  if (!group) return null;
                  return (
                  <AccordionItem key={category} value={category}>
                    <AccordionTrigger>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <CategoryIcon category={category} />
                          <span className="font-medium">{category}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          {(() => {
                            const income = group.income;
                            const expenses = group.expenses;
                            if (income <= 0 && expenses <= 0) return null;
                            const net = income - expenses;
                            const showNet = income > 0 && expenses > 0;
                            const amount = showNet ? Math.abs(net) : (income > 0 ? income : expenses);
                            const isNegative = showNet ? net < 0 : expenses > 0;
                            return (
                              <span className="font-semibold">
                                {formatCurrency(amount, displayCurrency, isNegative)}
                              </span>
                            );
                          })()}
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
                            const datePrefix = isDaily ? '' : `${format(entry.date, 'd/M')} `;
                            const displayText = `${datePrefix}${entry.description || 'No description'} ${isRecent ? '•' : ''}`;
                            return (
                              <div key={entry.id} className="flex justify-between items-center gap-2">
                                {isEditMode ? (
                                  <div className="flex items-center gap-2 flex-1">
                                    {renderRecurringIcon(entry)}
                                    <CategorySelector
                                      value={form.category}
                                      onChange={(val) => {
                                        if (entryErrors[entry.id]?.category) {
                                          setEntryErrors(prev => ({
                                            ...prev,
                                            [entry.id]: {
                                              amount: prev[entry.id]?.amount || false,
                                              category: false
                                            }
                                          }));
                                        }
                                        updateEditForm(entry.id, 'category', val);
                                      }}
                                      type={entry.type}
                                      hasError={!!entryErrors[entry.id]?.category}
                                    />
                                    <Input
                                      type="text"
                                      placeholder="Add a note..."
                                      value={form.description}
                                      onChange={(e) => updateEditForm(entry.id, 'description', e.target.value)}
                                      className="flex-1 h-8"
                                    />
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    {renderRecurringIcon(entry)}
                                    {shouldAnimate ? (
                                      <TypingText
                                        text={displayText}
                                        delay={70}
                                        repeat={false}
                                        hideCursorOnComplete={true}
                                        className="text-muted-foreground text-sm"
                                        grow={true}
                                        onComplete={onAnimationComplete}
                                      />
                                    ) : (
                                      <span className="text-muted-foreground text-sm">
                                        {displayText}
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
                                      value={form.amount}
                                      onChange={(e) => {
                                        if (entryErrors[entry.id]?.amount) {
                                          setEntryErrors(prev => ({
                                            ...prev,
                                            [entry.id]: {
                                              amount: false,
                                              category: prev[entry.id]?.category || false
                                            }
                                          }));
                                        }
                                        updateEditForm(entry.id, 'amount', e.target.value);
                                      }}
                                      className={`w-24 h-8 ${entryErrors[entry.id]?.amount ? 'border-destructive' : ''}`}
                                      aria-invalid={!!entryErrors[entry.id]?.amount}
                                    />
                                    <CurrencySelector
                                      value={form.currency}
                                      onChange={(val) => updateEditForm(entry.id, 'currency', val)}
                                    />
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={() => {
                                        setStagedDeleteIds(prev => {
                                          const next = new Set(prev);
                                          next.add(entry.id);
                                          return next;
                                        });
                                      }}
                                    >
                                      <Trash2 />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm whitespace-nowrap">
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
                  );
                })}
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
    </>
  );
}
