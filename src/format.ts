import { Array, String, pipe } from 'effect'

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

const DATE_KEY = /^\d{4}-(\d{2})-(\d{2})$/

const monthAndDay = (dateKey: string): readonly [string, number] => {
  const match = DATE_KEY.exec(dateKey)
  const month = MONTHS[Number(match?.[1] ?? 1) - 1] ?? MONTHS[0]
  return [month, Number(match?.[2] ?? 1)]
}

/** `"November 6"` for `"2026-11-06"`. */
export const longDate = (dateKey: string): string => {
  const [month, day] = monthAndDay(dateKey)
  return `${month} ${day}`
}

/** `"Nov 6"` for `"2026-11-06"`. */
export const shortDate = (dateKey: string): string => {
  const [month, day] = monthAndDay(dateKey)
  return `${month.slice(0, 3)} ${day}`
}

const twoDigits = (value: number): string =>
  pipe(globalThis.String(value), String.padStart(2, '0'))

/** `"07:04:09"` for a number of seconds. */
export const countdown = (totalSeconds: number): string =>
  pipe(
    [
      Math.floor(totalSeconds / 3600),
      Math.floor((totalSeconds % 3600) / 60),
      totalSeconds % 60,
    ],
    Array.map(twoDigits),
    Array.join(':'),
  )
