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
  let currentDate = new Date(startDate);
  let count = 0;

  while (count < recurrence.occurrenceCount) {
    const shouldInclude = shouldIncludeDate(currentDate, recurrence);
    
    if (shouldInclude) {
      dates.push(new Date(currentDate));
      count++;
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
    
    case 'biweekly':
      return addWeeks(date, 2 * interval);
    
    case 'monthly':
      const nextMonth = addMonths(date, interval);
      if (recurrence.dayOfMonth) {
        const lastDayOfMonth = new Date(
          nextMonth.getFullYear(),
          nextMonth.getMonth() + 1,
          0
        ).getDate();
        const targetDay = Math.min(recurrence.dayOfMonth, lastDayOfMonth);
        nextMonth.setDate(targetDay);
      }
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
  updates: Partial<RecurringTemplate>
): Promise<void> {
  const batch = writeBatch(db);

  batch.update(doc(db, 'recurringTemplates', templateId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });

  const futureEntries = await getDocs(
    query(
      collection(db, 'entries'),
      where('recurringTemplateId', '==', templateId),
      where('date', '>=', toUTCMidnight(new Date())),
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
      { regenerate: true, fromDate: new Date() }
    );
  }
}

export async function stopRecurring(templateId: string): Promise<void> {
  const batch = writeBatch(db);

  batch.delete(doc(db, 'recurringTemplates', templateId));

  const futureEntries = await getDocs(
    query(
      collection(db, 'entries'),
      where('recurringTemplateId', '==', templateId),
      where('date', '>=', toUTCMidnight(new Date())),
      where('isModified', '==', false)
    )
  );

  futureEntries.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
}

export async function deleteRecurringSeries(templateId: string): Promise<void> {
  const batch = writeBatch(db);

  batch.delete(doc(db, 'recurringTemplates', templateId));

  const allEntries = await getDocs(
    query(
      collection(db, 'entries'),
      where('recurringTemplateId', '==', templateId),
      where('isModified', '==', false)
    )
  );

  allEntries.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
}

export async function deleteRecurringInstance(entryId: string): Promise<void> {
  await deleteDoc(doc(db, 'entries', entryId));
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

export async function getRecurringTemplates(groupId: string): Promise<RecurringTemplate[]> {
  const templates = await getDocs(
    query(
      collection(db, 'recurringTemplates'),
      where('groupId', '==', groupId)
    )
  );

  return templates.docs.map(doc => convertFirestoreDoc<RecurringTemplate>(doc));
}

export function calculateEndDate(startDate: Date, recurrence: RecurrenceRule): Date {
  const dates = generateOccurrenceDates(startDate, recurrence);
  return dates[dates.length - 1] || startDate;
}

export function calculateNextOccurrence(
  template: RecurringTemplate,
  fromDate: Date = new Date()
): Date | null {
  const dates = generateOccurrenceDates(template.startDate, template.recurrence);
  const futureDate = dates.find(date => date >= fromDate);
  return futureDate || null;
}

export function getRemainingOccurrences(
  template: RecurringTemplate,
  fromDate: Date = new Date()
): number {
  const dates = generateOccurrenceDates(template.startDate, template.recurrence);
  return dates.filter(date => date >= fromDate).length;
}