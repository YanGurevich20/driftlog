'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, use } from 'react';
import { EntryForm } from '@/components/entry-form';
import { CategoriesSettings } from '@/components/categories-settings';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Entry } from '@/types';
import { convertFirestoreDoc } from '@/lib/firestore-utils';
import { toast } from 'sonner';

export default function EditEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useAuth();
  const router = useRouter();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [entryLoading, setEntryLoading] = useState(true);
  const { id } = use(params);

  useEffect(() => {
    const fetchEntry = async () => {
      if (!user || !id) return;
      
      try {
        const entryDoc = await getDoc(doc(db, 'entries', id));
        if (entryDoc.exists()) {
          const entryData = convertFirestoreDoc<Entry>(entryDoc);
          setEntry(entryData);
        } else {
          toast.error('Entry not found');
          router.push('/dashboard');
        }
      } catch {
        toast.error('Error fetching entry');
        router.push('/dashboard');
      } finally {
        setEntryLoading(false);
      }
    };

    if (user) {
      fetchEntry();
    }
  }, [user, id, router]);

  if (entryLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Entry not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <EntryForm entry={entry} />
      <CategoriesSettings />
    </div>
  );
}