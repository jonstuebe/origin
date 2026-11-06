/** A calendar day with a 1-based month, the shape Foldkit's `Calendar` uses. */
export interface CalendarDay {
  readonly year: number
  readonly month: number
  readonly day: number
}

/** Edition No. 1 is published on this local date. Each later day is the next number. */
export const LAUNCH_DATE: CalendarDay = { year: 2026, month: 11, day: 5 }

/** Editions left after today before readers see "Back tomorrow"; the build warns below this. */
export const RUNWAY_WARNING_DAYS = 14

const DAY_MS = 86_400_000

const toUtcMs = ({ year, month, day }: CalendarDay): number =>
  Date.UTC(year, month - 1, day)

/** The edition number published on a date: 1 on the launch date, 0 or less before it. */
export const editionNumberFor = (date: CalendarDay): number =>
  Math.round((toUtcMs(date) - toUtcMs(LAUNCH_DATE)) / DAY_MS) + 1

/** The date an edition number is published on. */
export const dateForEdition = (number: number): CalendarDay => {
  const date = new Date(toUtcMs(LAUNCH_DATE) + (number - 1) * DAY_MS)
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  }
}

/** `YYYY-MM-DD` for a calendar day. */
export const toDateKey = ({ year, month, day }: CalendarDay): string =>
  `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
