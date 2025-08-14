'use client';

import { useState } from 'react';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { formatRelativeDate } from '@/lib/date-utils';
import { formatCurrency, formatCurrencyWithSign } from '@/lib/currency-utils';
import { useEntries } from '@/hooks/use-entries';
import { ArrowUp, ArrowDown, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useRouter } from 'next/navigation';
import type { Entry } from '@/types';

export function EntriesList() {
  const { user } = useAuth();
  const router = useRouter();
  const [deletingEntry, setDeletingEntry] = useState<Entry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { entries, loading } = useEntries({
    spaceId: user?.defaultSpaceId,
  });

  const handleDelete = async () => {
    if (!deletingEntry) return;
    
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'entries', deletingEntry.id));
      toast.success('Entry deleted successfully');
      setDeletingEntry(null);
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error('Failed to delete entry');
    } finally {
      setIsDeleting(false);
    }
  };

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
            <div className={`p-2 rounded-full bg-muted`}>
              {entry.type === 'income' ? (
                <ArrowUp className="h-4 w-4 text-primary" />
              ) : (
                <ArrowDown className="h-4 w-4" />
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
              {entry.convertedAmount && entry.currency !== entry.baseCurrency && entry.baseCurrency && (
                <p className={`font-semibold ${
                  entry.type === 'income' ? 'text-primary' : ''
                }`}>
                  {formatCurrencyWithSign(entry.convertedAmount, entry.baseCurrency, entry.type === 'expense')}
                </p>
              )}
              {(!entry.convertedAmount || entry.currency === entry.baseCurrency) && (
                <p className={`font-semibold ${
                  entry.type === 'income' ? 'text-primary' : ''
                }`}>
                  {formatCurrencyWithSign(entry.amount, entry.currency, entry.type === 'expense')}
                </p>
              )}
              {entry.convertedAmount && entry.currency !== entry.baseCurrency && entry.baseCurrency && (
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(entry.amount, entry.currency)}
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
                <DropdownMenuItem onClick={() => router.push(`/dashboard/entry/${entry.id}`)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={() => setDeletingEntry(entry)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
      
      <AlertDialog open={!!deletingEntry} onOpenChange={() => setDeletingEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {deletingEntry?.type || 'entry'}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}