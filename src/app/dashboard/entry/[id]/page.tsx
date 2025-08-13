'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, use } from 'react';
import { EntryForm } from '@/components/entry-form';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Entry } from '@/types';

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
          const entryData = {
            id: entryDoc.id,
            ...entryDoc.data()
          } as Entry;
          
          // Check if user has access to this entry
          if (entryData.spaceId === user.defaultSpaceId) {
            setEntry(entryData);
          } else {
            console.error('User does not have access to this entry');
            router.push('/dashboard');
          }
        } else {
          console.error('Entry not found');
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Error fetching entry:', error);
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

  return <EntryForm entry={entry} />;
}