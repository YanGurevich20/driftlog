'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useEntries } from '@/hooks/use-entries';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import { Check, Trash2, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
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
import type { Entry } from '@/types';
import { getDateRangeForDay } from '@/lib/date-range-utils';
import { getUTCStartOfDay } from '@/lib/date-utils';
import { CategoryIcon } from '@/components/ui/category-icon';

export function ConfirmationView() {
  const { user } = useAuth();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<Entry | null>(null);
  const [editAmounts, setEditAmounts] = useState<Record<string, string>>({});
  const [confirmingAll, setConfirmingAll] = useState(false);
  const isDate = (val: unknown): val is Date => val instanceof Date;

  // Get today's entries
  const today = useMemo(() => new Date(), []);
  const dateRange = useMemo(() => getDateRangeForDay(today), [today]);
  const { entries, loading: entriesLoading } = useEntries({
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

  const { loading: ratesLoading } = useExchangeRates({
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

  // Filter stale entries: created before today AND not updated today (updatedAt nullable)
  const staleEntries = useMemo(() => {
    if (entriesLoading || ratesLoading || !entries) return [];

    const todayUTC = getUTCStartOfDay(today);

    return entries.filter(entry => {
      // Ignore entries until timestamps are resolved to real Dates (serverTimestamp placeholders)
      if (!isDate((entry as unknown as { createdAt?: unknown }).createdAt)) return false;
      const createdAtDate = (entry as unknown as { createdAt: Date }).createdAt;

      const createdBeforeToday = createdAtDate < todayUTC;

      const updatedAtUnknown = (entry as unknown as { updatedAt?: unknown }).updatedAt;
      const updatedAtDate = isDate(updatedAtUnknown) ? updatedAtUnknown : null;
      const updatedToday = updatedAtDate ? updatedAtDate >= todayUTC : false;

      return createdBeforeToday && !updatedToday;
    });
  }, [entries, entriesLoading, ratesLoading, today]);


  const handleConfirmAll = async () => {
    if (!user || staleEntries.length === 0) return;

    const invalid = staleEntries.some((entry) => {
      const amountString = editAmounts[entry.id] ?? entry.originalAmount.toString();
      const amount = parseFloat(amountString);
      return isNaN(amount) || amount <= 0;
    });
    if (invalid) {
      toast.error('Please enter valid amounts before confirming all');
      return;
    }

    setConfirmingAll(true);
    try {
      const promises = staleEntries.map((entry) => {
        const amountString = editAmounts[entry.id] ?? entry.originalAmount.toString();
        const amount = parseFloat(amountString);
        return updateEntry(entry.id, { originalAmount: amount }, user.id);
      });
      await Promise.all(promises);
      toast.success(`Confirmed ${staleEntries.length} entries`);
    } catch (error) {
      console.error('Error confirming entries:', error);
      toast.error('Failed to confirm some entries');
    } finally {
      setConfirmingAll(false);
    }
  };

  const saveInlineEdit = async (entry: Entry) => {
    if (!user) return;

    const amountString = editAmounts[entry.id] ?? entry.originalAmount.toString();
    const amount = parseFloat(amountString);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      await updateEntry(entry.id, { originalAmount: amount }, user.id);
      toast.success('Entry updated');
    } catch (error) {
      console.error('Failed to update entry:', error);
      toast.error('Failed to update entry');
    }
  };

  useEffect(() => {
    if (!staleEntries || staleEntries.length === 0) return;
    setEditAmounts((prev) => {
      const next = { ...prev };
      for (const entry of staleEntries) {
        if (next[entry.id] === undefined) {
          next[entry.id] = entry.originalAmount.toString();
        }
      }
      return next;
    });
  }, [staleEntries]);

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


  // Don't render if no stale entries or still loading
  if (entriesLoading || ratesLoading || staleEntries.length === 0) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle>Did these happen as planned?</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleConfirmAll}
              disabled={confirmingAll}
              title="Confirm all"
            >
              <ListChecks />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div>
            {staleEntries.map((entry, index) => (
              <div key={entry.id}>
                <div className="flex items-center justify-between rounded-md">
                  <div className="flex items-center gap-3 min-w-0">
                    <CategoryIcon category={entry.category} />
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-medium text-sm truncate">{entry.category}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {entry.description || 'No description'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={editAmounts[entry.id] ?? ''}
                        onChange={(e) => setEditAmounts((prev) => ({ ...prev, [entry.id]: e.target.value }))}
                        className="w-24 h-8"
                      />
                      <span className="text-xs text-muted-foreground">{entry.currency}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={() => saveInlineEdit(entry)}
                      >
                        <Check />
                      </Button>
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
                  </div>
                </div>
                {index < staleEntries.length - 1 && <Separator className="my-2" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
    </>
  );
}
