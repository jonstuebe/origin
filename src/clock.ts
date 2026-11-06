import { Clock, Effect, Schema } from 'effect'
import { Calendar } from 'foldkit'

/** The reader's local date and how long until it rolls over. */
export const ClockReading = Schema.Struct({
  today: Calendar.CalendarDate,
  secondsUntilMidnight: Schema.Number,
})
export type ClockReading = typeof ClockReading.Type

/** Reads the local calendar date and the seconds left in it at `millis`. */
export const clockReadingAt = (millis: number): ClockReading => {
  const now = new Date(millis)
  const nextMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  )
  return {
    today: Calendar.fromDateLocal(now),
    secondsUntilMidnight: Math.max(
      0,
      Math.ceil((nextMidnight.getTime() - millis) / 1000),
    ),
  }
}

export const readClock: Effect.Effect<ClockReading> = Effect.map(
  Clock.currentTimeMillis,
  clockReadingAt,
)
