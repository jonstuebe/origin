import { Calendar } from 'foldkit'

import { dateForEdition, editionNumberFor, toDateKey } from '../shared/edition'

/** Today's edition number for a local calendar date. */
export const todayNumber = (today: Calendar.CalendarDate): number =>
  editionNumberFor(today)

/** `YYYY-MM-DD` for an edition number. */
export const editionDateKey = (number: number): string =>
  toDateKey(dateForEdition(number))
