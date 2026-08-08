export const CLINIC_TIME_ZONE = 'Europe/London';

const dateKeyFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: CLINIC_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function clinicDateKey(value: string | Date = new Date()) {
  const parts = dateKeyFormatter.formatToParts(typeof value === 'string' ? new Date(value) : value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function clinicTime(value: string | Date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: CLINIC_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(typeof value === 'string' ? new Date(value) : value);
}

export function clinicDateTime(value: string | Date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: CLINIC_TIME_ZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
    hourCycle: 'h23',
  }).format(typeof value === 'string' ? new Date(value) : value);
}
