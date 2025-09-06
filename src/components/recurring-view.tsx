'use client';

import { useState, useMemo } from 'react';
import { MoreVertical, Trash2, Repeat, StopCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  CollapsibleCard, 
  CollapsibleCardContent, 
  CollapsibleCardFooter, 
  CollapsibleCardHeader, 
  CollapsibleCardTitle 
} from '@/components/ui/collapsible-card';
import { formatCurrency, convertAmount } from '@/lib/currency-utils';
import { useAuth } from '@/lib/auth-context';
import { stopRecurring, deleteRecurringSeries, formatRecurrenceRule } from '@/services/recurring';
import { useRecurringTemplates } from '@/hooks/use-recurring-templates';
import { useRecurringAggregates } from '@/hooks/use-recurring-aggregates';
// no need to import RecurringTemplate type here
import { toast } from 'sonner';
import {
  AlertDialog,
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
// no local date formatting; using formatter from services
import { DataState } from '@/components/ui/data-state';
import { useEntries } from '@/hooks/use-entries';
import { CategoryIcon } from '@/components/ui/category-icon';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import { getDateRangeForMonth } from '@/lib/date-range-utils';

export function RecurringView() {
  const { user } = useAuth();
  const { templates, loading, error } = useRecurringTemplates();
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    templateId: string;
    mode: 'stop' | 'delete-all';
  }>({ open: false, templateId: '', mode: 'stop' });

  const displayCurrency = user?.displayCurrency || 'USD';

  // Compute current month recurring net (including future days within the month)
  const monthRange = getDateRangeForMonth(new Date());
  const { entries: monthEntries, loading: entriesLoading } = useEntries({
    startDate: monthRange.start,
    endDate: monthRange.end,
  });
  const { ratesByMonth, loading: ratesLoading } = useExchangeRates({
    startDate: monthRange.start,
    endDate: monthRange.end,
  });

  const recurringMonthEntries = useMemo(() => {
    return monthEntries.filter((e) => !!e.recurringTemplateId);
  }, [monthEntries]);

  const monthlyRecurringTotals = useMemo(() => {
    if (ratesLoading || !ratesByMonth) return { income: 0, expenses: 0 };
    return recurringMonthEntries.reduce((acc, entry) => {
      const converted = convertAmount(
        entry.originalAmount,
        entry.currency,
        displayCurrency,
        entry.date,
        ratesByMonth
      );
      if (entry.type === 'income') {
        acc.income += converted;
      } else {
        acc.expenses += converted;
      }
      return acc;
    }, { income: 0, expenses: 0 });
  }, [recurringMonthEntries, ratesByMonth, ratesLoading, displayCurrency]);

  // Real-time aggregation data
  const { remainingByTemplate, loading: aggLoading } = useRecurringAggregates(templates);


  const handleDelete = async (mode: 'stop' | 'delete-all') => {
    if (!user?.id) return;
    const tpl = templates.find(t => t.id === deleteDialog.templateId);
    const ownerId = tpl?.userId || user.id;
    try {
      if (mode === 'stop') {
        await stopRecurring(deleteDialog.templateId, ownerId);
        toast.success('Recurrence stopped');
      } else {
        await deleteRecurringSeries(deleteDialog.templateId, ownerId);
        toast.success('Recurrence deleted');
      }
    } catch (err) {
      console.error('Failed to delete recurring:', err);
      toast.error('Failed to delete recurrence');
    } finally {
      setDeleteDialog({ open: false, templateId: '', mode: 'stop' });
    }
  };


  // Include templates with future entries OR those that had any entries this month
  const monthTemplateIds = useMemo(() => {
    const ids = new Set<string>();
    for (const e of recurringMonthEntries) {
      if (e.recurringTemplateId) ids.add(e.recurringTemplateId);
    }
    return ids;
  }, [recurringMonthEntries]);

  const visibleTemplates = useMemo(() => {
    return templates.filter(t => (remainingByTemplate[t.id] ?? 0) > 0 || monthTemplateIds.has(t.id));
  }, [templates, remainingByTemplate, monthTemplateIds]);

  return (
    <>
      <CollapsibleCard defaultCollapsed={true}>
        <CollapsibleCardHeader>
          <CollapsibleCardTitle>Recurring</CollapsibleCardTitle>
        </CollapsibleCardHeader>
        
        <CollapsibleCardContent>
          <DataState
            loading={loading || aggLoading}
            error={error}
            empty={visibleTemplates.length === 0}
            loadingVariant="skeleton"
            emptyTitle="No recurrences"
            emptyDescription="Create your first recurrence from the entry form"
            emptyIcon={Repeat}
          >
            <div className="divide-y">
              {visibleTemplates.map((template) => {
                return (
                  <div key={template.id} className={`flex justify-between items-start gap-2 py-2 first:pt-0 last:pb-0`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm flex items-center gap-2">
                          {template.entryTemplate.description ? (
                            template.entryTemplate.description
                          ) : (
                            <>
                              <CategoryIcon category={template.entryTemplate.category} />
                              {template.entryTemplate.category}
                            </>
                          )}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatRecurrenceRule(template)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${
                        template.entryTemplate.type === 'income' ? 'text-primary' : ''
                      }`}>
                        {formatCurrency(
                          template.entryTemplate.originalAmount,
                          template.entryTemplate.currency,
                          template.entryTemplate.type === 'expense',
                          template.entryTemplate.type === 'income'
                        )}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                          >
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setDeleteDialog({ 
                              open: true, 
                              templateId: template.id, 
                              mode: 'stop' 
                            })}
                          >
                            <StopCircle className="mr-2 h-4 w-4" />
                            Stop
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteDialog({ 
                              open: true, 
                              templateId: template.id, 
                              mode: 'delete-all' 
                            })}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          </DataState>
        </CollapsibleCardContent>
        {recurringMonthEntries.length > 0 && !entriesLoading && !ratesLoading && (
          <CollapsibleCardFooter>
            <div className="space-y-2 w-full">
              {monthlyRecurringTotals.income > 0 && (
                <div className="flex justify-between">
                  <span className="font-medium">Recurring Income</span>
                  <span className="text-lg font-bold text-primary">
                    {formatCurrency(monthlyRecurringTotals.income, displayCurrency, false, true)}
                  </span>
                </div>
              )}
              {monthlyRecurringTotals.expenses > 0 && (
                <div className="flex justify-between">
                  <span className="font-medium">Recurring Expenses</span>
                  <span className="text-lg font-bold">
                    {formatCurrency(monthlyRecurringTotals.expenses, displayCurrency, true)}
                  </span>
                </div>
              )}
            </div>
          </CollapsibleCardFooter>
        )}
      </CollapsibleCard>

      <AlertDialog 
        open={deleteDialog.open} 
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteDialog.mode === 'stop' ? 'Stop Recurrence' : 'Delete Recurrence'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.mode === 'stop' 
                ? 'This will delete all future recurring entries (including today) and keep the recurrence for history. Proceed?'
                : 'This will delete the recurrence and all recurring entries. Proceed?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant={deleteDialog.mode === 'delete-all' ? 'destructive' : 'default'}
              onClick={() => handleDelete(deleteDialog.mode)}
            >
              {deleteDialog.mode === 'stop' ? 'Stop' : 'Delete'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}