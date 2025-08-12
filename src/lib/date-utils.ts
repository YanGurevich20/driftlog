import { formatDistanceToNow, isToday, isYesterday, differenceInDays } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

export function formatRelativeDate(date: Timestamp | Date | null): string {
  if (!date) return '';
  
  const dateObj = date instanceof Date ? date : date.toDate();
  
  if (isToday(dateObj)) {
    return 'Today';
  } else if (isYesterday(dateObj)) {
    return 'Yesterday';
  } else {
    const days = differenceInDays(new Date(), dateObj);
    if (days < 7) {
      return `${days} days ago`;
    } else {
      return formatDistanceToNow(dateObj, { addSuffix: true });
    }
  }
}

export function toDate(date: Timestamp | Date | { toDate: () => Date } | undefined): Date | undefined {
  if (!date) return undefined;
  if (date instanceof Date) return date;
  if (typeof date === 'object' && 'toDate' in date) return date.toDate();
  return undefined;
}