'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency, convertAmount } from '@/lib/currency-utils';
import { useBudgetAllocations } from '@/hooks/use-budget-allocations';
import { useEntries } from '@/hooks/use-entries';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import {
  CollapsibleCard,
  CollapsibleCardContent,
  CollapsibleCardFooter,
  CollapsibleCardHeader,
  CollapsibleCardTitle
} from '@/components/ui/collapsible-card';
import { BudgetAllocationDialog } from '@/components/budget-allocation-dialog';
import { DataState } from '@/components/ui/data-state';
import { Progress } from '@/components/ui/progress';
import { CategoryIcon } from '@/components/ui/category-icon';
import { MultiCategorySelector } from '@/components/ui/multi-category-selector';
import { CurrencySelector } from '@/components/currency-selector';
import { getDateRangeForMonth } from '@/lib/date-range-utils';
import { isSameMonth } from 'date-fns';
import { Wallet, Edit2, Trash2, Check, X, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
 
import { toast } from 'sonner';
import { IconContainer } from './ui/icon-container';
import { computeUsedBudgetCategories } from '@/services/budget';

export function BudgetView() {
  const { user } = useAuth();

  // Get budget allocations
  const { allocations, loading: allocationsLoading, error: allocationsError, deleteAllocation, updateAllocation } = useBudgetAllocations();
  const [cardCollapsed, setCardCollapsed] = useState(allocations.length === 0);

  // State for edit/delete functionality
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForms, setEditForms] = useState<Record<string, {
    amount: string;
    categories: string[];
    currency: string;
  }>>({});
  const [stagedDeleteIds, setStagedDeleteIds] = useState<Set<string>>(new Set());

  // Get current month entries for budget calculation
  const monthRange = getDateRangeForMonth(new Date());
  const { entries: monthEntries, loading: entriesLoading, error: entriesError } = useEntries({
    startDate: monthRange.start,
    endDate: monthRange.end,
  });

  const displayCurrency = user?.displayCurrency || 'USD';
  const { ratesByMonth, loading: ratesLoading } = useExchangeRates({
    startDate: monthRange.start,
    endDate: monthRange.end,
  });
  const ratesReady = !!ratesByMonth && !ratesLoading;

  // Calculate spending by category for current month
  const categorySpending = useMemo(() => {
    if (!ratesReady) return new Map<string, number>();
    const spending = new Map<string, number>();
    monthEntries
      .filter(entry => entry.type === 'expense')
      .forEach(entry => {
        const converted = convertAmount(
          entry.originalAmount,
          entry.currency,
          displayCurrency,
          entry.date,
          ratesByMonth
        );
        const current = spending.get(entry.category) || 0;
        spending.set(entry.category, current + converted);
      });
    return spending;
  }, [monthEntries, displayCurrency, ratesByMonth, ratesReady]);

  const visibleAllocations = useMemo(() => (
    isEditMode && stagedDeleteIds.size > 0
      ? allocations.filter(a => !stagedDeleteIds.has(a.id))
      : allocations
  ), [allocations, isEditMode, stagedDeleteIds]);

  // Calculate budget progress for each allocation
  const budgetProgress = useMemo(() => {
    if (!ratesReady) return [] as Array<{
      id: string;
      amount: number;
      categories: string[];
      currency: string;
      spent: number;
      budget: number;
      progress: number;
    }>;
    return visibleAllocations.map(allocation => {
      const spent = allocation.categories.reduce((total, category) => total + (categorySpending.get(category) || 0), 0);
      const budget = convertAmount(
        allocation.amount,
        allocation.currency,
        displayCurrency,
        new Date(),
        ratesByMonth
      );
      const progress = budget > 0 ? (spent / budget) * 100 : 0;
      return {
        ...allocation,
        spent,
        budget,
        progress: Math.min(progress, 100),
      };
    });
  }, [visibleAllocations, categorySpending, displayCurrency, ratesByMonth, ratesReady]);

  // Calculate totals for footer
  const totals = useMemo(() => {
    if (!ratesReady) {
      return { totalIncome: 0, totalAllocated: 0, unallocatedSpending: 0, remaining: 0 };
    }
    const totalIncome = monthEntries
      .filter(entry => entry.type === 'income')
      .reduce((sum, entry) => sum + convertAmount(
        entry.originalAmount,
        entry.currency,
        displayCurrency,
        entry.date,
        ratesByMonth
      ), 0);
    const totalAllocated = budgetProgress.reduce((sum, item) => sum + item.budget, 0);
    const allocatedCategories = new Set(visibleAllocations.flatMap(a => a.categories));
    const unallocatedSpending = Array.from(categorySpending.entries())
      .filter(([category]) => !allocatedCategories.has(category))
      .reduce((sum, [, spending]) => sum + spending, 0);
    const remaining = totalIncome - totalAllocated;
    return { totalIncome, totalAllocated, unallocatedSpending, remaining };
  }, [monthEntries, budgetProgress, visibleAllocations, categorySpending, displayCurrency, ratesByMonth, ratesReady]);

  const loading = allocationsLoading || entriesLoading || ratesLoading;
  const error = allocationsError || entriesError;

  const enterEditMode = () => {
    setIsEditMode(true);
    setCardCollapsed(false);
    setStagedDeleteIds(new Set());
    // Initialize edit forms for all budgets
    const forms: Record<string, { amount: string; categories: string[]; currency: string }> = {};
    allocations.forEach(item => {
      forms[item.id] = {
        amount: item.amount.toString(),
        categories: item.categories,
        currency: item.currency
      };
    });
    setEditForms(forms);
  };

  const exitEditMode = () => {
    setIsEditMode(false);
    setEditForms({});
    setStagedDeleteIds(new Set());
  };

  const updateEditForm = (id: string, field: keyof typeof editForms[string], value: string | string[]) => {
    setEditForms(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

  const saveAllEdits = async () => {
    try {
      // Only update allocations that still exist (filter out deleted ones)
      const existingAllocationIds = new Set(budgetProgress.map(item => item.id));
      const validEntries = Object.entries(editForms)
        .filter(([id]) => existingAllocationIds.has(id));
      
      // Validate that all amounts are not empty and are valid numbers
      const invalidAmountEntries = validEntries.filter(([, form]) => {
        const amount = form.amount.trim();
        return !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0;
      });
      
      if (invalidAmountEntries.length > 0) {
        toast.error('Please enter valid amounts for all budgets');
        return;
      }

      // Validate that all budgets have at least one category
      const invalidCategoryEntries = validEntries.filter(([, form]) => {
        return !form.categories || form.categories.length === 0;
      });
      
      if (invalidCategoryEntries.length > 0) {
        toast.error('Each budget must have at least one category');
        return;
      }
      
      const updatePromises = validEntries.map(([id, form]) => 
        updateAllocation(id, {
          amount: parseFloat(form.amount),
          categories: form.categories,
          currency: form.currency
        })
      );

      const deletePromises = Array.from(stagedDeleteIds).map(id => deleteAllocation(id));

      const ops = [...updatePromises, ...deletePromises];

      if (ops.length === 0) {
        toast.info('No changes made');
        exitEditMode();
        return;
      }

      await Promise.all(ops);
      toast.success('Budgets updated');
      exitEditMode();
    } catch (error) {
      console.error('Failed to update budgets:', error);
      toast.error('Failed to update budgets');
    }
  };


  // staged deletion replaces immediate delete

  return (
    <CollapsibleCard
      defaultCollapsed={allocations.length === 0}
      collapsed={cardCollapsed}
      setCollapsed={setCardCollapsed}
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
                  <X/>
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={enterEditMode}
                  disabled={budgetProgress.length === 0}
                >
                  <Edit2/>
                </Button>
              </>
            )}
            <BudgetAllocationDialog onOpenNew={() => setCardCollapsed(false)} />
          </div>
        }
      >
        <CollapsibleCardTitle>Budgets</CollapsibleCardTitle>
      </CollapsibleCardHeader>

      <CollapsibleCardContent>
        <DataState
          loading={loading}
          error={error}
          empty={isEditMode ? visibleAllocations.length === 0 : allocations.length === 0}
          loadingVariant="skeleton"
          emptyTitle="No budgets"
          emptyDescription="Add your first budget to start tracking spending"
          emptyIcon={Wallet}
        >
          <div className="space-y-4">
            {budgetProgress.map((item) => (
              <div key={item.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  {isEditMode ? (
                      <div className="flex items-center gap-2 flex-1">
                        <MultiCategorySelector
                          value={editForms[item.id]?.categories ?? []}
                          onChange={(categories) => updateEditForm(item.id, 'categories', categories)}
                          type="expense"
                          disabledCategories={Array.from(
                            computeUsedBudgetCategories({
                              allocations,
                              stagedDeleteIds,
                              editForms,
                              excludeAllocationIds: new Set([item.id])
                            })
                          )}
                          maxItems={4}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={editForms[item.id]?.amount ?? ''}
                          onChange={(e) => updateEditForm(item.id, 'amount', e.target.value)}
                          className="w-20"
                        />
                        <CurrencySelector
                          value={editForms[item.id]?.currency ?? displayCurrency}
                          onChange={(currency) => updateEditForm(item.id, 'currency', currency)}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setStagedDeleteIds(prev => {
                              const next = new Set(prev);
                              next.add(item.id);
                              return next;
                            });
                          }}
                        >
                          <Trash2/>
                        </Button>
                      </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 h-8">
                        <div className="flex items-center gap-2">
                          {item.categories.map((category) => (
                            <IconContainer key={category}>
                              <CategoryIcon category={category} />
                            </IconContainer>
                          ))}
                        </div>
                        {item.categories.length === 1 && (
                          <span className="font-medium">{item.categories[0]}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 h-8">
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(Math.max(0, item.budget - item.spent), displayCurrency, false)} / {formatCurrency(item.budget, displayCurrency, false)}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <Progress value={item.progress}/>
              </div>
            ))}
          </div>
        </DataState>
      </CollapsibleCardContent>

      {totals.remaining >= 0 && (
        <CollapsibleCardFooter>
          <div className="space-y-2 w-full">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="size-8 flex items-center justify-center"><Coins className="h-4 w-4" /></div>
                <span className="font-medium">Unbudgeted</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {formatCurrency(Math.max(0, totals.remaining - totals.unallocatedSpending), displayCurrency, false)} / {formatCurrency(totals.remaining, displayCurrency, false)}
              </div>
            </div>
            <Progress 
              value={totals.remaining > 0 ? Math.min((totals.unallocatedSpending / totals.remaining) * 100, 100) : 0}
              className={`h-2 ${
                totals.unallocatedSpending > totals.remaining ? '[&>*]:bg-orange-400' :
                totals.remaining > 0 && (totals.unallocatedSpending / totals.remaining) > 0.8 ? '[&>*]:bg-yellow-500' : ''
              }`}
            />
          </div>
        </CollapsibleCardFooter>
      )}

      
    </CollapsibleCard>
  );
}
