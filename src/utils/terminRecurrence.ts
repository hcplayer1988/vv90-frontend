import type { Termin } from '../api/termine'
 
/** Strips the time portion so two dates can be compared by day only. */
export function atMidnight(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}
 
export function daysBetween(a: Date, b: Date): number {
  const MS_PER_DAY = 1000 * 60 * 60 * 24
  return Math.round((atMidnight(b).getTime() - atMidnight(a).getTime()) / MS_PER_DAY)
}
 
/**
 * Checks whether a given Termin occurs on the given calendar day - either
 * because it's a one-off event on exactly that day, or because it's a
 * recurring event whose rule (unit + interval) produces an occurrence on
 * that day. This is pure frontend logic: the backend only stores the rule
 * (see Termin.recurrence_label), it doesn't generate individual rows.
 */
export function occursOnDay(termin: Termin, day: Date): boolean {
  const start = new Date(termin.start)
 
  if (!termin.ist_wiederkehrend) {
    return atMidnight(start).getTime() === atMidnight(day).getTime()
  }
 
  if (day < atMidnight(start)) return false
  if (termin.wiederholung_bis && atMidnight(day) > atMidnight(new Date(termin.wiederholung_bis))) {
    return false
  }
 
  const interval = termin.wiederholung_abstand ?? 1
 
  switch (termin.wiederholung_einheit) {
    case 'tage':
      return daysBetween(start, day) % interval === 0
    case 'wochen':
      return daysBetween(start, day) % (interval * 7) === 0
    case 'monate': {
      if (day.getDate() !== start.getDate()) return false
      const monthDiff = (day.getFullYear() - start.getFullYear()) * 12 + (day.getMonth() - start.getMonth())
      return monthDiff >= 0 && monthDiff % interval === 0
    }
    default:
      return false
  }
}
 
/**
 * Scans forward day by day from `from` and returns the earliest Termin of
 * the given type that occurs on some day (respecting recurrence), along
 * with that day's date. Used for the dashboard's "next training"/"next
 * match" cards. Returns null if nothing is found within the search horizon.
 */
export function findNextOccurrence(
  termine: Termin[],
  typ: Termin['typ'],
  from: Date = new Date(),
  horizonDays = 400
): { termin: Termin; date: Date } | null {
  for (let i = 0; i <= horizonDays; i++) {
    const day = new Date(from)
    day.setDate(day.getDate() + i)
 
    const matches = termine.filter((t) => t.typ === typ && occursOnDay(t, day))
    if (matches.length > 0) {
      matches.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      return { termin: matches[0], date: day }
    }
  }
  return null
}
 