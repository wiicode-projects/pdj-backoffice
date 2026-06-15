const WEEK_STARTS_ON = 1; // Monday

export function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + weeks * 7);
  return result;
}

export function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = (day - WEEK_STARTS_ON + 7) % 7;
  result.setDate(result.getDate() - diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function endOfWeek(date: Date): Date {
  const result = startOfWeek(date);
  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
}

export function isWithinInterval(date: Date, start: Date, end: Date): boolean {
  const time = date.getTime();
  return time >= start.getTime() && time <= end.getTime();
}

export function toDateKey(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isToday(date: Date): boolean {
  const today = new Date();
  return toDateKey(date) === toDateKey(today);
}

export function isTomorrow(date: Date): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toDateKey(date) === toDateKey(tomorrow);
}

export function formatDayMonth(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

export function formatWeekdayDate(date: Date, locale: string): string {
  const raw = date.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}
