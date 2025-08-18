'use client';

import React, { createContext, useContext, useRef, useCallback, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, Timestamp, QueryConstraint } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { convertFirestoreDoc } from '@/lib/firestore-utils';
import type { Entry } from '@/types';

interface CacheKey {
  memberIds: string[];
  startTime?: number;
  endTime?: number;
}

interface CacheEntry {
  entries: Entry[];
  loading: boolean;
  error: Error | null;
  subscribers: Set<(entries: Entry[], loading: boolean, error: Error | null) => void>;
  unsubscribe?: () => void;
}

interface EntriesCache {
  subscribe: (
    key: CacheKey,
    callback: (entries: Entry[], loading: boolean, error: Error | null) => void
  ) => () => void;
}

const EntriesCacheContext = createContext<EntriesCache | null>(null);

export function EntriesCacheProvider({ children }: { children: React.ReactNode }) {
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());

  const getCacheKey = (key: CacheKey): string => {
    return JSON.stringify({
      memberIds: key.memberIds.sort(),
      startTime: key.startTime,
      endTime: key.endTime,
    });
  };

  const subscribe = useCallback((
    key: CacheKey,
    callback: (entries: Entry[], loading: boolean, error: Error | null) => void
  ) => {
    const cacheKey = getCacheKey(key);
    let cacheEntry = cacheRef.current.get(cacheKey);

    if (!cacheEntry) {
      cacheEntry = {
        entries: [],
        loading: true,
        error: null,
        subscribers: new Set(),
      };
      cacheRef.current.set(cacheKey, cacheEntry);

      const constraints: QueryConstraint[] = [
        where('userId', 'in', key.memberIds),
      ];

      if (key.startTime) {
        constraints.push(where('date', '>=', Timestamp.fromMillis(key.startTime)));
      }
      
      if (key.endTime) {
        constraints.push(where('date', '<=', Timestamp.fromMillis(key.endTime)));
      }

      constraints.push(orderBy('date', 'desc'));

      const q = query(collection(db, 'entries'), ...constraints);

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const newEntries: Entry[] = [];
          snapshot.forEach((doc) => {
            newEntries.push(convertFirestoreDoc<Entry>(doc));
          });
          
          const entry = cacheRef.current.get(cacheKey);
          if (entry) {
            entry.entries = newEntries;
            entry.loading = false;
            entry.error = null;
            entry.subscribers.forEach(cb => cb(newEntries, false, null));
          }
        },
        (err) => {
          console.error('Error fetching entries:', err);
          const entry = cacheRef.current.get(cacheKey);
          if (entry) {
            entry.error = err as Error;
            entry.loading = false;
            entry.subscribers.forEach(cb => cb(entry.entries, false, err as Error));
          }
        }
      );

      cacheEntry.unsubscribe = unsubscribe;
    }

    cacheEntry.subscribers.add(callback);
    callback(cacheEntry.entries, cacheEntry.loading, cacheEntry.error);

    return () => {
      const entry = cacheRef.current.get(cacheKey);
      if (entry) {
        entry.subscribers.delete(callback);
        
        if (entry.subscribers.size === 0) {
          if (entry.unsubscribe) {
            entry.unsubscribe();
          }
          cacheRef.current.delete(cacheKey);
        }
      }
    };
  }, []);

  useEffect(() => {
    const cache = cacheRef.current;
    return () => {
      cache.forEach(entry => {
        if (entry.unsubscribe) {
          entry.unsubscribe();
        }
      });
      cache.clear();
    };
  }, []);

  return (
    <EntriesCacheContext.Provider value={{ subscribe }}>
      {children}
    </EntriesCacheContext.Provider>
  );
}

export function useEntriesCache() {
  const context = useContext(EntriesCacheContext);
  return context;
}