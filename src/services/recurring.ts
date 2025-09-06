import { 
  collection, 
  doc, 
  getDoc,
  serverTimestamp, 
  writeBatch,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format, addDays, addWeeks, addMonths, addYears } from 'date-fns';
import { toUTCMidnight } from '@/lib/date-utils';
import { SERVICE_START_DATE } from '@/lib/config';
import { convertFirestoreDoc } from '@/lib/firestore-utils';
import type { RecurringTemplate, RecurrenceRule } from '@/types';

function getRecurringEntryId(templateId: string, date: Date): string {
  const dateStr = format(date, 'yyyyMMdd');
  return `rt_${templateId}_${dateStr}`;
}

function generateOccurrenceDates(
  startDate: Date,
  recurrence: RecurrenceRule
): Date[] {
  const dates: Date[] = [];
  const endDate = new Date(recurrence.endDate);
  endDate.setHours(23, 59, 59, 999);
  // Clamp start to service start
  const effectiveStart = new Date(Math.max(startDate.getTime(), SERVICE_START_DATE.getTime()));

  // Handle weekly with multiple weekdays by emitting all selected weekdays per interval window
  if (recurrence.frequency === 'weekly' && recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
    // Sort weekdays ascending (0=Sun..6=Sat)
    const sortedWeekdays = [...recurrence.daysOfWeek].sort((a, b) => a - b);
    const intervalWeeks = (recurrence.interval || 1);

    // Cursor aligned to the week containing startDate
    let cursor = new Date(effectiveStart);

    while (cursor <= endDate) {
      // Compute week start (Sunday)
      const weekStart = new Date(cursor);
      weekStart.setHours(0, 0, 0, 0);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());

      for (const weekday of sortedWeekdays) {
        const occurrence = new Date(weekStart);
        occurrence.setDate(weekStart.getDate() + weekday);
        occurrence.setHours(0, 0, 0, 0);

        // Skip days prior to startDate (only on the first week)
        if (occurrence < effectiveStart) continue;
        if (occurrence > endDate) break;

        dates.push(new Date(occurrence));
      }

      // Advance to the next interval window
      cursor = addWeeks(weekStart, intervalWeeks);
    }

    return dates;
  }

  // Default behavior: step by frequency and include dates that match optional weekday filters
  let currentDate = new Date(effectiveStart);
  while (currentDate <= endDate) {
    const shouldInclude = shouldIncludeDate(currentDate, recurrence);
    if (shouldInclude) {
      dates.push(new Date(currentDate));
    }
    currentDate = getNextDate(currentDate, recurrence);
  }

  return dates;
}

function shouldIncludeDate(date: Date, recurrence: RecurrenceRule): boolean {
  if (recurrence.frequency === 'daily' && recurrence.daysOfWeek?.length) {
    const dayOfWeek = date.getUTCDay();
    return recurrence.daysOfWeek.includes(dayOfWeek);
  }

  if (recurrence.frequency === 'weekly' && recurrence.daysOfWeek?.length) {
    const dayOfWeek = date.getUTCDay();
    return recurrence.daysOfWeek.includes(dayOfWeek);
  }

  return true;
}

function getNextDate(date: Date, recurrence: RecurrenceRule): Date {
  const { frequency, interval = 1 } = recurrence;

  switch (frequency) {
    case 'daily':
      return addDays(date, interval);
    
    case 'weekly':
      return addWeeks(date, interval);
    
    case 'monthly':
      // Monthly by day-of-month with automatic rollback for short months
      const nextMonth = addMonths(date, interval);
      const baseDay = recurrence.dayOfMonth || date.getDate();
      const lastDayOfMonth = new Date(Date.UTC(
        nextMonth.getUTCFullYear(),
        nextMonth.getUTCMonth() + 1,
        0
      )).getUTCDate();
      const targetDay = Math.min(baseDay, lastDayOfMonth);
      nextMonth.setDate(targetDay);
      return nextMonth;
    
    case 'yearly':
      return addYears(date, interval);
    
    default:
      throw new Error(`Unknown frequency: ${frequency}`);
  }
}

export async function createRecurringTemplate(
  template: Omit<RecurringTemplate, 'id' | 'createdAt'>
): Promise<string> {
  const templateRef = doc(collection(db, 'recurringTemplates'));
  const templateId = templateRef.id;

  // Generate all occurrence dates
  const dates = generateOccurrenceDates(template.startDate, template.recurrence);
  
  // Create template and first batch of entries atomically
  let batch = writeBatch(db);
  
  // Add template to batch
  batch.set(templateRef, {
    ...template,
    createdAt: serverTimestamp(),
  });

  // Add entries to batch (up to 199 since template takes 1 slot)
  let createdCount = 0;
  for (const date of dates) {
    const entryId = getRecurringEntryId(templateId, date);
    const entryRef = doc(db, 'entries', entryId);
    
    const entryData = {
      ...template.entryTemplate,
      userId: template.userId,
      date: toUTCMidnight(date),
      recurringTemplateId: templateId,
      isRecurringInstance: true,
      isModified: false,
      createdBy: template.createdBy,
      createdAt: serverTimestamp(),
    };
    
    batch.set(entryRef, entryData);
    createdCount++;
    
    if (createdCount >= 199) {
      // Commit first batch with template
      await batch.commit();
      
      // Create remaining entries if needed
      if (createdCount < dates.length) {
        batch = writeBatch(db);
        for (let i = createdCount; i < dates.length; i++) {
          const date = dates[i];
          const entryId = getRecurringEntryId(templateId, date);
          const entryRef = doc(db, 'entries', entryId);
          
          const entryData = {
            ...template.entryTemplate,
            userId: template.userId,
            date: toUTCMidnight(date),
            recurringTemplateId: templateId,
            isRecurringInstance: true,
            isModified: false,
            createdBy: template.createdBy,
            createdAt: serverTimestamp(),
          };
          
          batch.set(entryRef, entryData);
          
          if ((i - createdCount + 1) % 200 === 0 && i < dates.length - 1) {
            await batch.commit();
            batch = writeBatch(db);
          }
        }
        await batch.commit();
      }
      
      return templateId;
    }
  }
  
  // Commit if all fit in first batch
  await batch.commit();
  return templateId;
}



export async function stopRecurring(templateId: string, userId: string): Promise<void> {
  const batch = writeBatch(db);

  const futureEntries = await getDocs(
    query(
      collection(db, 'entries'),
      where('userId', '==', userId),
      where('recurringTemplateId', '==', templateId),
      where('date', '>=', toUTCMidnight(new Date()))
    )
  );

  futureEntries.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
}

export async function deleteRecurringSeries(templateId: string, userId: string): Promise<void> {
  const batch = writeBatch(db);

  batch.delete(doc(db, 'recurringTemplates', templateId));

  // Delete ALL entries in the series (both modified and unmodified)
  const allEntries = await getDocs(
    query(
      collection(db, 'entries'),
      where('userId', '==', userId),
      where('recurringTemplateId', '==', templateId)
    )
  );

  allEntries.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
}


export async function getRecurringTemplates(userId: string): Promise<RecurringTemplate[]> {
  // Resolve member IDs using mutual connections
  let memberIds: string[] = [userId];
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const connectedIds = (userDoc.data().connectedUserIds as string[] | undefined) || [];
      memberIds = [userId, ...connectedIds];
    }
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Falling back to single-user recurring templates due to error:', e);
    }
  }

  // Firestore "in" supports up to 10 values; chunk if needed
  const chunks: string[][] = [];
  for (let i = 0; i < memberIds.length; i += 10) {
    chunks.push(memberIds.slice(i, i + 10));
  }

  const results: RecurringTemplate[] = [];
  for (const chunk of chunks) {
    const snap = await getDocs(
      query(
        collection(db, 'recurringTemplates'),
        where('userId', 'in', chunk)
      )
    );
    results.push(...snap.docs.map(d => convertFirestoreDoc<RecurringTemplate>(d)));
  }

  return results;
}

export async function getRecurringTemplatesForMembers(memberIds: string[]): Promise<RecurringTemplate[]> {
  if (memberIds.length === 0) return [];

  // Firestore "in" supports up to 10 values; chunk if needed
  const chunks: string[][] = [];
  for (let i = 0; i < memberIds.length; i += 10) {
    chunks.push(memberIds.slice(i, i + 10));
  }

  const results: RecurringTemplate[] = [];
  for (const chunk of chunks) {
    const snap = await getDocs(
      query(
        collection(db, 'recurringTemplates'),
        where('userId', 'in', chunk)
      )
    );
    results.push(...snap.docs.map(d => convertFirestoreDoc<RecurringTemplate>(d)));
  }

  return results;
}

// -------------------- Human-readable formatter --------------------
const weekdayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

const ordinal = (n: number) => {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
};

const joinWithAnd = (items: string[]): string => {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
};

const toValidDate = (input: unknown): Date | null => {
  if (!input) return null;
  if (input instanceof Date && !Number.isNaN(input.getTime())) return input;
  if (typeof (input as { toDate?: () => Date }).toDate === 'function') {
    const d = (input as { toDate: () => Date }).toDate();
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof input === 'object' && input !== null && 'seconds' in (input as Record<string, unknown>)) {
    const seconds = (input as { seconds?: unknown }).seconds;
    if (typeof seconds === 'number') {
      const d = new Date(seconds * 1000);
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }
  if (typeof input === 'string' || typeof input === 'number') {
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
};

export function formatRecurrenceRule(template: RecurringTemplate): string {
  const { recurrence } = template;
  const end = toValidDate(recurrence.endDate);
  const until = end ? `until ${format(end, 'M/d/yyyy')}` : '';
  const every = (() => {
    const interval = recurrence.interval || 1;
    switch (recurrence.frequency) {
      case 'daily':
        return interval === 1 ? 'every day' : `every ${interval} days`;
      case 'weekly': {
        const days = joinWithAnd((recurrence.daysOfWeek || []).map((d) => weekdayNames[d]));
        const base = interval === 1 ? 'every week' : `every ${interval} weeks`;
        return days ? `${base} on ${days}` : base;
      }
      case 'monthly': {
        const base = interval === 1 ? 'every month' : `every ${interval} months`;
        const dom = recurrence.dayOfMonth;
        return dom ? `${base} on the ${ordinal(dom)}` : base;
      }
      case 'yearly': {
        const base = interval === 1 ? 'every year' : `every ${interval} years`;
        const start = toValidDate(template.startDate);
        if (!start) return base;
        const day = start.getDate();
        const monthName = format(start, 'MMMM').toLowerCase();
        return `${base} on the ${ordinal(day)} of ${monthName}`;
      }
    }
  })();
  const result = [every, until].filter(Boolean).join(' ');
  return result.charAt(0).toUpperCase() + result.slice(1);
}