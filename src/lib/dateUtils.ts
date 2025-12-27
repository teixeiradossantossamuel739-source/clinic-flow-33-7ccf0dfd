/**
 * Parse a date string in 'YYYY-MM-DD' format as a LOCAL date (not UTC).
 * This avoids timezone issues where new Date('2025-01-10') is interpreted as UTC
 * and can shift to the previous day in timezones like Brazil (UTC-3).
 */
export function parseLocalDate(dateString: string): Date {
  if (!dateString) return new Date();
  
  const [year, month, day] = dateString.split('-').map(Number);
  // Month is 0-indexed in JavaScript Date constructor
  return new Date(year, month - 1, day);
}

/**
 * Format a date to 'YYYY-MM-DD' string in local timezone
 */
export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
