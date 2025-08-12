'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { formatRelativeDate } from '@/lib/date-utils';
import { formatCurrency, formatCurrencyWithSign } from '@/lib/currency-utils';
import { ArrowUpRight, ArrowDownRight, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EntryModal } from '@/components/entry-modal';
import type { Entry } from '@/types';

export function EntriesList() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

  useEffect(() => {
    if (!user?.defaultSpaceId) return;

    const q = query(
      collection(db, 'entries'),
      where('spaceId', '==', user.defaultSpaceId),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newEntries: Entry[] = [];
      snapshot.forEach((doc) => {
        newEntries.push({
          id: doc.id,
          ...doc.data(),
        } as Entry);
      });
      setEntries(newEntries);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.defaultSpaceId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No entries yet. Click the + button to add your first entry!
      </div>
    );
  }


  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex items-center justify-between p-4 bg-card border rounded-lg"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${
              entry.type === 'income' 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                : 'bg-muted'
            }`}>
              {entry.type === 'income' ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-medium">
                {entry.category}
              </p>
              {entry.description && (
                <p className="text-sm text-muted-foreground">
                  {entry.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {formatRelativeDate(entry.date)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className={`font-semibold ${
                entry.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : ''
              }`}>
                {formatCurrencyWithSign(entry.amount, entry.currency, entry.type === 'income')}
              </p>
              {entry.convertedAmount && entry.currency !== entry.baseCurrency && entry.baseCurrency && (
                <p className="text-xs text-muted-foreground">
                  ≈ {formatCurrency(entry.convertedAmount, entry.baseCurrency)}
                </p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditingEntry(entry)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
      
      {editingEntry && (
        <EntryModal
          open={!!editingEntry}
          onClose={() => setEditingEntry(null)}
          editEntry={editingEntry}
          onSuccess={() => setEditingEntry(null)}
        />
      )}
    </div>
  );
}