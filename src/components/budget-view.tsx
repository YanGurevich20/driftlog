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
  CollapsibleCardHeader,
  CollapsibleCardTitle
} from '@/components/ui/collapsible-card';
import { BudgetAllocationDialog } from '@/components/budget-allocation-dialog';
import { DataState } from '@/components/ui/data-state';
import { Progress } from '@/components/ui/progress';
import { CategoryIcon } from '@/components/ui/category-icon';
import { CategorySelector } from '@/components/category-selector';
import { CurrencySelector } from '@/components/currency-selector';
import { getDateRangeForMonth } from '@/lib/date-range-utils';
import { isSameMonth } from 'date-fns';
import { Wallet, Edit2, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { toast } from 'sonner';
import type { BudgetAllocation } from '@/types';

export function BudgetView() {
  const { user } = useAuth();

  // Get budget allocations
  const { allocations, loading: allocationsLoading, error: allocationsError, deleteAllocation, updateAllocation } = useBudgetAllocations();

  // State for edit/delete functionality
  const [editAllocation, setEditAllocation] = useState<BudgetAllocation | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [allocationToDelete, setAllocationToDelete] = useState<BudgetAllocation | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForms, setEditForms] = useState<Record<string, {
    amount: string;
    category: string;
    currency: string;
  }>>({});

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

  // Calculate spending by category for current month
  const categorySpending = useMemo(() => {
    if (ratesLoading || !ratesByMonth) {
      return new Map<string, number>();
    }

    const spending = new Map<string, number>();

    monthEntries
      .filter(entry => entry.type === 'expense' && isSameMonth(entry.date, new Date()))
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
  }, [monthEntries, displayCurrency, ratesByMonth, ratesLoading]);

  // Calculate budget progress for each allocation
  const budgetProgress = useMemo(() => {
    if (ratesLoading || !ratesByMonth) {
      return [];
    }

    return allocations.map(allocation => {
      const spent = categorySpending.get(allocation.category) || 0;
      const budget = convertAmount(
        allocation.amount,
        allocation.currency,
        displayCurrency,
        new Date(), // Use current date for conversion
        ratesByMonth
      );

      const progress = budget > 0 ? (spent / budget) * 100 : 0;

      return {
        ...allocation,
        spent,
        budget,
        progress: Math.min(progress, 100),
        overBudget: progress > 100,
      };
    });
  }, [allocations, categorySpending, displayCurrency, ratesByMonth, ratesLoading]);


  const loading = allocationsLoading || entriesLoading || ratesLoading;
  const error = allocationsError || entriesError;

  const handleDelete = (allocation: BudgetAllocation) => {
    setAllocationToDelete(allocation);
    setDeleteDialogOpen(true);
  };

  const enterEditMode = () => {
    setIsEditMode(true);
    // Initialize edit forms for all budgets
    const forms: Record<string, { amount: string; category: string; currency: string }> = {};
    budgetProgress.forEach(item => {
      forms[item.id] = {
        amount: item.amount.toString(),
        category: item.category,
        currency: item.currency
      };
    });
    setEditForms(forms);
  };

  const exitEditMode = () => {
    setIsEditMode(false);
    setEditForms({});
  };

  const updateEditForm = (id: string, field: keyof typeof editForms[string], value: string) => {
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
      const invalidEntries = validEntries.filter(([, form]) => {
        const amount = form.amount.trim();
        return !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0;
      });
      
      if (invalidEntries.length > 0) {
        toast.error('Please enter valid amounts for all budgets');
        return;
      }
      
      const promises = validEntries.map(([id, form]) => 
        updateAllocation(id, {
          amount: parseFloat(form.amount),
          category: form.category,
          currency: form.currency
        })
      );
      await Promise.all(promises);
      toast.success('Budgets updated');
      exitEditMode();
    } catch (error) {
      console.error('Failed to update budgets:', error);
      toast.error('Failed to update budgets');
    }
  };


  const confirmDelete = async () => {
    if (!allocationToDelete) return;

    try {
      await deleteAllocation(allocationToDelete.id);
      toast.success('Budget deleted');
      setDeleteDialogOpen(false);
      setAllocationToDelete(null);
    } catch (error) {
      console.error('Failed to delete budget:', error);
      toast.error('Failed to delete budget');
    }
  };

  return (
    <CollapsibleCard defaultCollapsed={allocations.length === 0}>
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
                <BudgetAllocationDialog
                  editAllocation={editAllocation}
                  onEditClose={() => setEditAllocation(null)}
                />
              </>
            )}
          </div>
        }
      >
        <CollapsibleCardTitle>Budgets</CollapsibleCardTitle>
      </CollapsibleCardHeader>

      <CollapsibleCardContent>
        <DataState
          loading={loading}
          error={error}
          empty={allocations.length === 0}
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
                    <>
                      <div className="flex items-center gap-2">
                        <CategorySelector
                          value={editForms[item.id]?.category || item.category}
                          onChange={(category) => updateEditForm(item.id, 'category', category)}
                          type="expense"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          defaultValue={editForms[item.id]?.amount || item.amount.toString()}
                          onChange={(e) => updateEditForm(item.id, 'amount', e.target.value)}
                          className="flex-1"
                        />
                        <CurrencySelector
                          value={editForms[item.id]?.currency || item.currency}
                          onChange={(currency) => updateEditForm(item.id, 'currency', currency)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2/>
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 h-8">
                        <CategoryIcon category={item.category} />
                        <span className="font-medium">{item.category}</span>
                      </div>
                      <div className="flex items-center gap-2 h-8">
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(item.spent, displayCurrency, false)} / {formatCurrency(item.budget, displayCurrency, false)}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <Progress
                  value={item.progress}
                  className={`h-2 ${
                    item.overBudget ? '[&>*]:bg-orange-400' :
                    item.progress > 80 ? '[&>*]:bg-yellow-500' : ''
                  }`}
                />
              </div>
            ))}
          </div>
        </DataState>
      </CollapsibleCardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the budget for &quot;{allocationToDelete?.category}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CollapsibleCard>
  );
}
