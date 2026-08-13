export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

// Monday-indexed: 0=Monday..6=Sunday (matches the backend's custom_days convention).
export function mondayIndexedWeekday(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function startOfWeekMonday(date: Date): Date {
  return addDays(date, -mondayIndexedWeekday(date));
}

// Formats a "HH:MM" or "HH:MM:SS" 24-hour string (as stored by the backend)
// into a locale-aware "8:30 AM" style label.
export function formatTimeOfDay(time: string): string {
  const [hourStr, minuteStr] = time.split(':');
  const reference = new Date();
  reference.setHours(Number(hourStr), Number(minuteStr), 0, 0);
  return reference.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
