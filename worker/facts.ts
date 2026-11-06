import { type CalendarDay, dateForEdition, toDateKey } from '../shared/edition'

/** One day's fact as stored in `facts.json`, in publishing order. */
export interface StoredFact {
  readonly question: string
  readonly headline: string
  readonly body: string
}

/** A published fact, as `GET /api/fact/:number` returns it. */
export interface PublishedFact extends StoredFact {
  readonly number: number
  readonly date: string
}

/** A past edition's question, as `GET /api/archive/:number` lists it. */
export interface ArchiveEntry {
  readonly number: number
  readonly date: string
  readonly question: string
}

const HOUR_MS = 3_600_000
const EARLIEST_UTC_OFFSET_HOURS = 14

/**
 * True once the edition's date has begun somewhere on Earth. The earliest
 * time zone is UTC+14, so a date starts 14 hours before its UTC midnight.
 */
export const isPublished = (number: number, now: number): boolean => {
  const { year, month, day }: CalendarDay = dateForEdition(number)
  return (
    now >= Date.UTC(year, month - 1, day) - EARLIEST_UTC_OFFSET_HOURS * HOUR_MS
  )
}

/** The fact for an edition, or null before launch, after the list runs out, or before it is published. */
export const publishedFact = (
  facts: ReadonlyArray<StoredFact>,
  number: number,
  now: number,
): PublishedFact | null => {
  const fact = facts[number - 1]
  if (number < 1 || !fact || !isPublished(number, now)) {
    return null
  }
  return { number, date: toDateKey(dateForEdition(number)), ...fact }
}

/** Questions for every edition before `number`, newest first. Null when `number` itself isn't out yet. */
export const archiveBefore = (
  facts: ReadonlyArray<StoredFact>,
  number: number,
  now: number,
): ReadonlyArray<ArchiveEntry> | null => {
  if (number < 1 || !isPublished(number, now)) {
    return null
  }
  const count = Math.min(number - 1, facts.length)
  return Array.from({ length: count }, (_, index) => {
    const entryNumber = count - index
    return {
      number: entryNumber,
      date: toDateKey(dateForEdition(entryNumber)),
      question: facts[entryNumber - 1]!.question,
    }
  })
}
