'use client';

import { useState, useEffect, useMemo } from 'react';
import { MoreVertical, Edit2, Trash2, Repeat, StopCircle } from 'lucide-react';
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
import { stopRecurring, deleteRecurringSeries } from '@/services/recurring';
import { useRecurringTemplates } from '@/hooks/use-recurring-templates';
import type { RecurringTemplate } from '@/types';
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
import { format } from 'date-fns';
import { DataState } from '@/components/ui/data-state';
import { useEntries } from '@/hooks/use-entries';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import { getDateRangeForMonth } from '@/lib/date-range-utils';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { getCountFromServer } from 'firebase/firestore';
import { toUTCMidnight } from '@/lib/date-utils';

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

  const monthlyRecurringNet = useMemo(() => {
    if (ratesLoading || !ratesByMonth) return 0;
    return recurringMonthEntries.reduce((sum, entry) => {
      const converted = convertAmount(
        entry.originalAmount,
        entry.currency,
        displayCurrency,
        entry.date,
        ratesByMonth
      );
      return sum + (entry.type === 'income' ? converted : -converted);
    }, 0);
  }, [recurringMonthEntries, ratesByMonth, ratesLoading, displayCurrency]);

  // Actual next occurrence and remaining per template, based on entries
  const [nextByTemplate, setNextByTemplate] = useState<Record<string, Date | null>>({});
  const [remainingByTemplate, setRemainingByTemplate] = useState<Record<string, number>>({});
  const [aggLoading, setAggLoading] = useState(false);

  useEffect(() => {
    const fetchAggregates = async () => {
      if (!templates.length || !user?.id) {
        setNextByTemplate({});
        setRemainingByTemplate({});
        return;
      }
      setAggLoading(true);
      try {
        const todayUtc = toUTCMidnight(new Date());
        const entriesColl = collection(db, 'entries');

        const tasks = templates.map(async (t) => {
          // Next occurrence
          const nextQ = query(
            entriesColl,
            where('userId', '==', t.userId),
            where('recurringTemplateId', '==', t.id),
            where('date', '>', Timestamp.fromDate(todayUtc)),
            orderBy('date', 'asc'),
            limit(1)
          );
          const nextSnap = await getDocs(nextQ);
          const nextDate = nextSnap.empty ? null : nextSnap.docs[0].data().date.toDate();

          // Remaining count
          const remainingQ = query(
            entriesColl,
            where('userId', '==', t.userId),
            where('recurringTemplateId', '==', t.id),
            where('date', '>', Timestamp.fromDate(todayUtc))
          );
          const remainingSnap = await getCountFromServer(remainingQ);
          const remaining = Number(remainingSnap.data().count || 0);

          return { id: t.id, nextDate, remaining };
        });

        const results = await Promise.all(tasks);
        const nextMap: Record<string, Date | null> = {};
        const remMap: Record<string, number> = {};
        results.forEach(({ id, nextDate, remaining }) => {
          nextMap[id] = nextDate;
          remMap[id] = remaining;
        });
        setNextByTemplate(nextMap);
        setRemainingByTemplate(remMap);
      } catch (e) {
        console.error('Failed to compute recurring aggregates:', e);
      } finally {
        setAggLoading(false);
      }
    };

    fetchAggregates();
  }, [templates, user?.id]);


  const handleDelete = async (mode: 'stop' | 'delete-all') => {
    if (!user?.id) return;
    const tpl = templates.find(t => t.id === deleteDialog.templateId);
    const ownerId = tpl?.userId || user.id;
    try {
      if (mode === 'stop') {
        await stopRecurring(deleteDialog.templateId, ownerId);
        toast.success('Recurring entry stopped');
      } else {
        await deleteRecurringSeries(deleteDialog.templateId, ownerId);
        toast.success('Recurring series deleted');
      }
    } catch (err) {
      console.error('Failed to delete recurring:', err);
      toast.error('Failed to delete recurring entry');
    } finally {
      setDeleteDialog({ open: false, templateId: '', mode: 'stop' });
    }
  };

  const getFrequencyLabel = (template: RecurringTemplate): string => {
    const { frequency, interval = 1 } = template.recurrence;
    
    if (interval === 1) {
      switch (frequency) {
        case 'daily': return 'Daily';
        case 'weekly': return 'Weekly';
        case 'monthly': return 'Monthly';
        case 'yearly': return 'Yearly';
      }
    }
    
    switch (frequency) {
      case 'daily': return `Every ${interval} days`;
      case 'weekly': return `Every ${interval} weeks`;
      case 'monthly': return `Every ${interval} months`;
      case 'yearly': return `Every ${interval} years`;
      default: return frequency;
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
          <CollapsibleCardTitle className="text-primary">Recurring Entries</CollapsibleCardTitle>
        </CollapsibleCardHeader>
        
        <CollapsibleCardContent>
          <DataState
            loading={loading || aggLoading}
            error={error}
            empty={visibleTemplates.length === 0}
            loadingVariant="skeleton"
            emptyTitle="No recurring entries"
            emptyDescription="Create your first recurring entry from the entry form"
            emptyIcon={Repeat}
          >
            <div className="divide-y">
              {visibleTemplates.map((template) => {
                const nextDate = nextByTemplate[template.id] ?? null;
                const remaining = remainingByTemplate[template.id] ?? 0;
                
                return (
                  <div key={template.id} className={`flex justify-between items-start gap-2 py-2 first:pt-0 last:pb-0`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {template.entryTemplate.description || template.entryTemplate.category}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {getFrequencyLabel(template)} · {' '}
                        {nextDate ? (
                          <>Next: {format(nextDate, 'MMM d')} · {remaining} remaining</>
                        ) : (
                          'Completed'
                        )}
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
                            onClick={() => {
                              toast.info('Edit functionality coming soon');
                            }}
                          >
                            <Edit2 className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
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
            <div className="flex justify-between w-full">
              <span className="font-medium">{format(monthRange.start, 'MMMM')} Recurring Net</span>
              <span className={`text-lg font-bold ${monthlyRecurringNet >= 0 ? 'text-primary' : ''}`}>
                {formatCurrency(Math.abs(monthlyRecurringNet), displayCurrency, monthlyRecurringNet < 0)}
              </span>
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
              {deleteDialog.mode === 'stop' ? 'Stop Recurring Entry' : 'Delete Recurring Series'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.mode === 'stop' 
                ? 'This will delete all future unmodified entries (including today) and keep the template for history. Proceed?'
                : 'This will delete the template and all unmodified entries. Modified entries will be preserved. Proceed?'}
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