import { formatDistanceToNow, isToday, isYesterday, differenceInDays } from 'date-fns';

export function formatRelativeDate(date: Date | null): string {
  if (!date) return '';
  
  if (isToday(date)) {
    return 'Today';
  } else if (isYesterday(date)) {
    return 'Yesterday';
  } else {
    const days = differenceInDays(new Date(), date);
    if (days < 7) {
      return `${days} days ago`;
    } else {
      return formatDistanceToNow(date, { addSuffix: true });
    }
  }
}