import { Option } from 'effect'

import { type ClockReading } from './clock'
import {
  type Archive,
  ArchiveAsyncData,
  type Fact,
  FactAsyncData,
  type Progress,
  emptyProgress,
} from './domain'
import { Model } from './model'
import { AppRoute } from './route'

/** Nov 6, 2026 is edition No. 2. */
export const clockOnNov6: ClockReading = {
  today: { year: 2026, month: 11, day: 6 },
  secondsUntilMidnight: 3 * 3600 + 4 * 60 + 9,
}

export const fact1: Fact = {
  number: 1,
  date: '2026-11-05',
  question: 'Why do we measure a ship’s speed in knots?',
  headline: 'Sailors literally counted knots.',
  body: 'A chip log was tossed overboard on a knotted line.',
}

export const fact2: Fact = {
  number: 2,
  date: '2026-11-06',
  question: 'Why is the front panel of a car called the dashboard?',
  headline: 'It was built to block flying mud.',
  body: 'Carriage dashboards stopped mud dashed up by hooves.',
}

export const archiveOnNov6: Archive = {
  number: 2,
  entries: [{ number: 1, date: '2026-11-05', question: fact1.question }],
}

export const modelWith = (
  overrides: Partial<{
    route: AppRoute
    todayFact: typeof FactAsyncData.schema.Type
    pastFact: typeof FactAsyncData.schema.Type
    archive: typeof ArchiveAsyncData.schema.Type
    progress: Progress
  }> = {},
): Model =>
  Model.make({
    route: overrides.route ?? AppRoute.Today(),
    clock: clockOnNov6,
    todayFact: overrides.todayFact ?? FactAsyncData.Success({ data: fact2 }),
    pastFact: overrides.pastFact ?? FactAsyncData.Idle(),
    archive: overrides.archive ?? ArchiveAsyncData.Idle(),
    progress: overrides.progress ?? emptyProgress,
    maybeShareOutcome: Option.none(),
  })
