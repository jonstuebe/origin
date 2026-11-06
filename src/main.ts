import { Effect, Option, Schema } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import { Runtime } from 'foldkit'
import { Url } from 'foldkit/url'

import { BrowserKeyValueStore } from '@effect/platform-browser'

import { ClockReading, readClock } from './clock'
import { PROGRESS_STORAGE_KEY } from './command'
import {
  AppUpdate,
  ArchiveAsyncData,
  FactAsyncData,
  Progress,
  ProgressJsonString,
  emptyProgress,
} from './domain'
import { Message } from './message'
import { Model } from './model'
import { urlToAppRoute } from './route'
import { loadForRoute } from './update'

export { Message } from './message'
export { Model } from './model'
export { subscriptions } from './subscription'
export { update } from './update'
export { view } from './view'

// FLAGS

export const Flags = Schema.Struct({
  clock: ClockReading,
  progress: Progress,
})
export type Flags = typeof Flags.Type

const savedProgress: Effect.Effect<Progress> = Effect.gen(function* () {
  const store = yield* KeyValueStore.KeyValueStore
  const json = yield* Effect.fromOption(
    Option.fromNullishOr(yield* store.get(PROGRESS_STORAGE_KEY)),
  )
  return yield* Schema.decodeEffect(ProgressJsonString)(json)
}).pipe(
  Effect.catch(() => Effect.succeed(emptyProgress)),
  Effect.provide(BrowserKeyValueStore.layerLocalStorage),
)

export const flags: Effect.Effect<Flags> = Effect.gen(function* () {
  const clock = yield* readClock
  const progress = yield* savedProgress
  return Flags.make({ clock, progress })
})

// INIT

export const init: Runtime.RoutingApplicationInit<Model, Message, Flags> = (
  flags: Flags,
  url: Url,
) =>
  loadForRoute({
    route: urlToAppRoute(url),
    clock: flags.clock,
    todayFact: FactAsyncData.Idle(),
    pastFact: FactAsyncData.Idle(),
    archive: ArchiveAsyncData.Idle(),
    progress: flags.progress,
    maybeShareOutcome: Option.none(),
    appUpdate: AppUpdate.Current(),
  })
