import { Array, Option, Record, Schema, pipe } from 'effect'
import { AsyncData } from 'foldkit'
import { defineTaggedUnion } from 'foldkit/schema'

/** One day's question and its answer, as the Worker serves it. */
export const Fact = Schema.Struct({
  number: Schema.Number,
  date: Schema.String,
  question: Schema.String,
  headline: Schema.String,
  body: Schema.String,
})
export type Fact = typeof Fact.Type

/** A past edition's question in the archives. */
export const ArchiveEntry = Schema.Struct({
  number: Schema.Number,
  date: Schema.String,
  question: Schema.String,
})
export type ArchiveEntry = typeof ArchiveEntry.Type

/** Every edition before `number`, newest first. */
export const Archive = Schema.Struct({
  number: Schema.Number,
  entries: Schema.Array(ArchiveEntry),
})
export type Archive = typeof Archive.Type

/** Why a fact or the archives couldn't be loaded. */
export const FetchError = defineTaggedUnion({
  NotPublished: {},
  Unreachable: {},
})
export type FetchError = typeof FetchError.Type

export const FactAsyncData = AsyncData.Schema(Fact, FetchError)
export const ArchiveAsyncData = AsyncData.Schema(Archive, FetchError)
export type FactState = typeof FactAsyncData.schema.Type
export type ArchiveState = typeof ArchiveAsyncData.schema.Type

/** The reader's answer to "Did you already know this?". */
export const Verdict = Schema.Literals(['Knew', 'New'])
export type Verdict = typeof Verdict.Type

/** What the reader has done with one edition. */
export const DayProgress = Schema.Struct({
  isRevealed: Schema.Boolean,
  maybeVerdict: Schema.Option(Verdict),
})
export type DayProgress = typeof DayProgress.Type

/** Every edition the reader has touched, keyed by edition number. */
export const Progress = Schema.Struct({
  days: Schema.Record(Schema.String, DayProgress),
})
export type Progress = typeof Progress.Type

export const ProgressJsonString = Schema.fromJsonString(
  Schema.toCodecJson(Progress),
)

/** Whether a newer version of the site is waiting to take over. */
export const AppUpdate = defineTaggedUnion({
  Current: {},
  Available: {},
  Dismissed: {},
  Applying: {},
})
export type AppUpdate = typeof AppUpdate.Type

export const emptyProgress: Progress = { days: {} }

const untouchedDay: DayProgress = {
  isRevealed: false,
  maybeVerdict: Option.none(),
}

/** The reader's progress on one edition, untouched when there is none. */
export const dayProgress = (progress: Progress, number: number): DayProgress =>
  Option.getOrElse(
    Record.get(progress.days, String(number)),
    () => untouchedDay,
  )

/** Applies a change to one edition's progress. */
export const updateDay =
  (number: number, change: (day: DayProgress) => DayProgress) =>
  (progress: Progress): Progress => ({
    days: Record.set(
      progress.days,
      String(number),
      change(dayProgress(progress, number)),
    ),
  })

/** Consecutive revealed days ending today, or ending yesterday while today is still unrevealed. */
export const streak = (progress: Progress, todayNumber: number): number => {
  const isRevealed = (number: number): boolean =>
    dayProgress(progress, number).isRevealed
  const start = isRevealed(todayNumber) ? todayNumber : todayNumber - 1
  return pipe(
    Array.range(1, Math.max(1, start)),
    Array.reverse,
    Array.takeWhile(isRevealed),
    Array.length,
  )
}

/** How many editions the reader marked with a verdict. */
export const countVerdicts = (progress: Progress, verdict: Verdict): number =>
  pipe(
    Record.values(progress.days),
    Array.filter(day =>
      Option.exists(day.maybeVerdict, marked => marked === verdict),
    ),
    Array.length,
  )
