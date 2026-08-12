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
