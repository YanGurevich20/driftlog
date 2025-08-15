/**
 * Converts a local date to UTC midnight for consistent storage
 * @param localDate - Date in user's local timezone
 * @returns Date object at midnight UTC for the same calendar date
 */
export function toUTCMidnight(localDate: Date): Date {
  const year = localDate.getFullYear();
  const month = localDate.getMonth();
  const day = localDate.getDate();
  
  // Create a new date at midnight UTC
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
}

/**
 * Converts a UTC midnight date to local date for form editing
 * This is only needed for calendar pickers that expect local dates
 * @param utcDate - Date stored at midnight UTC
 * @returns Date object in local timezone for form editing
 */
export function fromUTCMidnight(utcDate: Date): Date {
  // Get the UTC components
  const year = utcDate.getUTCFullYear();
  const month = utcDate.getUTCMonth();
  const day = utcDate.getUTCDate();
  
  // Create a new date in local timezone
  return new Date(year, month, day, 0, 0, 0, 0);
}

/**
 * Gets the start of day in UTC for date range queries
 * @param localDate - Date in user's local timezone
 * @returns Date object at start of day UTC
 */
export function getUTCStartOfDay(localDate: Date): Date {
  const year = localDate.getFullYear();
  const month = localDate.getMonth();
  const day = localDate.getDate();
  
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
}

/**
 * Gets the end of day in UTC for date range queries
 * @param localDate - Date in user's local timezone
 * @returns Date object at end of day UTC
 */
export function getUTCEndOfDay(localDate: Date): Date {
  const year = localDate.getFullYear();
  const month = localDate.getMonth();
  const day = localDate.getDate();
  
  return new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
}

/**
 * Formats a date for display (date only, no time)
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatDateOnly(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}