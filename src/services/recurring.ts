import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
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
import type { RecurringTemplate, RecurrenceRule, Entry } from '@/types';

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
    const dayOfWeek = date.getDay();
    return recurrence.daysOfWeek.includes(dayOfWeek);
  }

  if (recurrence.frequency === 'weekly' && recurrence.daysOfWeek?.length) {
    const dayOfWeek = date.getDay();
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
      const lastDayOfMonth = new Date(
        nextMonth.getFullYear(),
        nextMonth.getMonth() + 1,
        0
      ).getDate();
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
  template: Omit<RecurringTemplate, 'id' | 'createdAt' | 'instancesCreated'>
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
    instancesCreated: dates.length,
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
      originalDate: toUTCMidnight(date),
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
            originalDate: toUTCMidnight(date),
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

export async function materializeRecurringEntries(
  templateId: string,
  template: Omit<RecurringTemplate, 'id' | 'createdAt' | 'instancesCreated'>,
  options?: { 
    regenerate?: boolean;
    fromDate?: Date;
  }
): Promise<number> {
  const dates = generateOccurrenceDates(
    options?.fromDate || template.startDate,
    template.recurrence
  );

  // For regeneration, prefetch all existing instances
  const existingEntries = new Map<string, { isModified: boolean }>();
  if (options?.regenerate) {
    const existingQuery = await getDocs(
      query(
        collection(db, 'entries'),
        where('userId', '==', template.userId),
        where('recurringTemplateId', '==', templateId)
      )
    );
    existingQuery.forEach(doc => {
      existingEntries.set(doc.id, { 
        isModified: doc.data().isModified || false 
      });
    });
  }

  let batch = writeBatch(db);
  let createdCount = 0;
  let batchCount = 0;

  for (const date of dates) {
    if (options?.fromDate && date < options.fromDate) {
      continue;
    }

    const entryId = getRecurringEntryId(templateId, date);
    const entryRef = doc(db, 'entries', entryId);

    if (options?.regenerate) {
      // Check prefetched data
      const existing = existingEntries.get(entryId);
      if (existing) {
        if (!existing.isModified) {
          // Update unmodified entries
          const entryData = {
            ...template.entryTemplate,
            userId: template.userId,
            date: toUTCMidnight(date),
            recurringTemplateId: templateId,
            originalDate: toUTCMidnight(date),
            isRecurringInstance: true,
            isModified: false,
            updatedBy: template.createdBy,
            updatedAt: serverTimestamp(),
          };
          batch.set(entryRef, entryData, { merge: true });
          createdCount++;
          batchCount++;
        }
        // Skip modified entries
      }
      // Skip non-existing entries during regeneration (deleted entries)
    } else {
      // Initial creation
      const entryData = {
        ...template.entryTemplate,
        userId: template.userId,
        date: toUTCMidnight(date),
        recurringTemplateId: templateId,
        originalDate: toUTCMidnight(date),
        isRecurringInstance: true,
        isModified: false,
        createdBy: template.createdBy,
        createdAt: serverTimestamp(),
      };
      batch.set(entryRef, entryData);
      createdCount++;
      batchCount++;
    }

    if (batchCount >= 200) {
      await batch.commit();
      batch = writeBatch(db);
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  await setDoc(
    doc(db, 'recurringTemplates', templateId),
    { 
      instancesCreated: createdCount,
      updatedAt: serverTimestamp() 
    },
    { merge: true }
  );

  return createdCount;
}

export async function updateRecurringTemplate(
  templateId: string,
  userId: string,
  updates: Partial<RecurringTemplate>
): Promise<void> {
  const batch = writeBatch(db);

  batch.update(doc(db, 'recurringTemplates', templateId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const futureEntries = await getDocs(
    query(
      collection(db, 'entries'),
      where('userId', '==', userId),
      where('recurringTemplateId', '==', templateId),
      where('date', '>=', toUTCMidnight(tomorrow)),
      where('isModified', '==', false)
    )
  );

  futureEntries.forEach(doc => batch.delete(doc.ref));
  await batch.commit();

  const templateDoc = await getDoc(doc(db, 'recurringTemplates', templateId));
  if (templateDoc.exists()) {
    const fullTemplate = convertFirestoreDoc<RecurringTemplate>(templateDoc);
    await materializeRecurringEntries(
      templateId, 
      { ...fullTemplate, ...updates },
      { regenerate: true, fromDate: tomorrow }
    );
  }
}

export async function stopRecurring(templateId: string, userId: string, fromDate?: Date): Promise<void> {
  const batch = writeBatch(db);

  // If no date provided, default to today (inclusive)
  const effectiveDate = fromDate || new Date();
  
  const futureEntries = await getDocs(
    query(
      collection(db, 'entries'),
      where('userId', '==', userId),
      where('recurringTemplateId', '==', templateId),
      where('date', '>=', toUTCMidnight(effectiveDate)),
      where('isModified', '==', false)
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

export async function editRecurringInstance(
  entryId: string,
  updates: Partial<Entry>
): Promise<void> {
  await setDoc(
    doc(db, 'entries', entryId),
    {
      ...updates,
      isModified: true,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function getRecurringTemplates(userId: string): Promise<RecurringTemplate[]> {
  // Resolve group member IDs for the provided userId
  let memberIds: string[] = [userId];
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    const groupId = userDoc.exists() ? (userDoc.data().groupId as string | undefined) : undefined;
    if (groupId) {
      const groupDoc = await getDoc(doc(db, 'userGroups', groupId));
      if (groupDoc.exists()) {
        const ids = (groupDoc.data().memberIds as string[]) || [];
        if (ids.length > 0) memberIds = ids;
      }
    }
  } catch (e) {
    // Fallback to just the provided userId on any error
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