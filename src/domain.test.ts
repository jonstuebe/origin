import { Option, Schema } from 'effect'
import { describe, expect, test } from 'vitest'

import { clockReadingAt } from './clock'
import {
  type Progress,
  ProgressJsonString,
  countVerdicts,
  emptyProgress,
  streak,
} from './domain'
import { countdown, longDate, shortDate } from './format'

const revealed = (...numbers: ReadonlyArray<number>): Progress => ({
  days: Object.fromEntries(
    numbers.map(number => [
      String(number),
      { isRevealed: true, maybeVerdict: Option.none() },
    ]),
  ),
})

describe('streak', () => {
  test('counts back from today once today is revealed', () => {
    expect(streak(revealed(3, 4, 5), 5)).toBe(3)
  })

  test('counts back from yesterday while today is unrevealed', () => {
    expect(streak(revealed(3, 4), 5)).toBe(2)
  })

  test('breaks at a missed day', () => {
    expect(streak(revealed(1, 2, 4, 5), 5)).toBe(2)
    expect(streak(revealed(1, 2), 5)).toBe(0)
  })

  test('is zero with no progress, including on launch day', () => {
    expect(streak(emptyProgress, 1)).toBe(0)
    expect(streak(emptyProgress, 10)).toBe(0)
  })
})

test('countVerdicts tallies each verdict', () => {
  const progress: Progress = {
    days: {
      '1': { isRevealed: true, maybeVerdict: Option.some('Knew') },
      '2': { isRevealed: true, maybeVerdict: Option.some('New') },
      '3': { isRevealed: true, maybeVerdict: Option.some('New') },
      '4': { isRevealed: true, maybeVerdict: Option.none() },
    },
  }
  expect(countVerdicts(progress, 'New')).toBe(2)
  expect(countVerdicts(progress, 'Knew')).toBe(1)
})

test('progress survives a round trip through storage', () => {
  const progress: Progress = {
    days: { '7': { isRevealed: true, maybeVerdict: Option.some('Knew') } },
  }
  const json = Schema.encodeSync(ProgressJsonString)(progress)
  expect(json).not.toContain('_id')
  expect(Schema.decodeSync(ProgressJsonString)(json)).toEqual(progress)
})

test('clockReadingAt reads the local date and time to midnight', () => {
  const reading = clockReadingAt(new Date(2026, 10, 6, 23, 59, 30).getTime())
  expect(reading.today).toEqual({ year: 2026, month: 11, day: 6 })
  expect(reading.secondsUntilMidnight).toBe(30)
})

test('formatting helpers', () => {
  expect(longDate('2026-11-06')).toBe('November 6')
  expect(shortDate('2027-01-15')).toBe('Jan 15')
  expect(countdown(3 * 3600 + 4 * 60 + 9)).toBe('03:04:09')
})
