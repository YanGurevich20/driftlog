import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toUTCMidnight } from '@/lib/date-utils';
import type { RecurringTemplate } from '@/types';

interface RecurringAggregates {
  nextByTemplate: Record<string, Date | null>;
  remainingByTemplate: Record<string, number>;
  loading: boolean;
}

export function useRecurringAggregates(templates: RecurringTemplate[]): RecurringAggregates {
  const [nextByTemplate, setNextByTemplate] = useState<Record<string, Date | null>>({});
  const [remainingByTemplate, setRemainingByTemplate] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const templateIds = useMemo(() => templates.map(t => t.id), [templates]);

  const debouncedUpdate = useCallback(() => {
    let timeoutId: NodeJS.Timeout;
    return (updateFn: () => void) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateFn, 100);
    };
  }, []);

  useEffect(() => {
    if (templateIds.length === 0) {
      setNextByTemplate({});
      setRemainingByTemplate({});
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribes: (() => void)[] = [];
    const nextDates: Record<string, Date | null> = {};
    const remainingCounts: Record<string, number> = {};
    let completedQueries = 0;
    const debouncer = debouncedUpdate();

    const todayUtc = toUTCMidnight(new Date());

    const checkCompletion = () => {
      completedQueries++;
      if (completedQueries >= templateIds.length * 2) {
        debouncer(() => {
          setNextByTemplate({ ...nextDates });
          setRemainingByTemplate({ ...remainingCounts });
          setLoading(false);
        });
      }
    };

    templateIds.forEach((templateId) => {
      const template = templates.find(t => t.id === templateId);
      if (!template) {
        nextDates[templateId] = null;
        remainingCounts[templateId] = 0;
        checkCompletion();
        checkCompletion();
        return;
      }

      // Query for next occurrence
      const nextQuery = query(
        collection(db, 'entries'),
        where('userId', '==', template.userId),
        where('recurringTemplateId', '==', templateId),
        where('date', '>', Timestamp.fromDate(todayUtc)),
        orderBy('date', 'asc'),
        limit(1)
      );

      const nextUnsubscribe = onSnapshot(
        nextQuery,
        (snapshot) => {
          const nextDate = snapshot.empty ? null : snapshot.docs[0].data().date.toDate();
          nextDates[templateId] = nextDate;
          debouncer(() => {
            setNextByTemplate(prev => ({ ...prev, [templateId]: nextDate }));
          });
          checkCompletion();
        },
        (error) => {
          console.error(`Error fetching next occurrence for template ${templateId}:`, error);
          nextDates[templateId] = null;
          setNextByTemplate(prev => ({ ...prev, [templateId]: null }));
          checkCompletion();
        }
      );

      // Query for remaining count
      const remainingQuery = query(
        collection(db, 'entries'),
        where('userId', '==', template.userId),
        where('recurringTemplateId', '==', templateId),
        where('date', '>', Timestamp.fromDate(todayUtc))
      );

      const remainingUnsubscribe = onSnapshot(
        remainingQuery,
        (snapshot) => {
          const count = snapshot.size;
          remainingCounts[templateId] = count;
          debouncer(() => {
            setRemainingByTemplate(prev => ({ ...prev, [templateId]: count }));
          });
          checkCompletion();
        },
        (error) => {
          console.error(`Error fetching remaining count for template ${templateId}:`, error);
          remainingCounts[templateId] = 0;
          setRemainingByTemplate(prev => ({ ...prev, [templateId]: 0 }));
          checkCompletion();
        }
      );

      unsubscribes.push(nextUnsubscribe, remainingUnsubscribe);
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [templateIds, templates, debouncedUpdate]);

  return {
    nextByTemplate,
    remainingByTemplate,
    loading,
  };
}