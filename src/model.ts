import { Schema } from 'effect'

import { ClockReading } from './clock'
import { AppUpdate, ArchiveAsyncData, FactAsyncData, Progress } from './domain'
import { ShareOutcome } from './message'
import { AppRoute } from './route'

export const Model = Schema.Struct({
  route: AppRoute,
  clock: ClockReading,
  todayFact: FactAsyncData.schema,
  pastFact: FactAsyncData.schema,
  archive: ArchiveAsyncData.schema,
  progress: Progress,
  maybeShareOutcome: Schema.Option(ShareOutcome),
  appUpdate: AppUpdate,
})
export type Model = typeof Model.Type
