import { Duration, Stream } from 'effect'
import { Subscription } from 'foldkit'

import { readClock } from './clock'
import { Message } from './message'
import { type Model } from './model'
import { waitingUpdates } from './serviceWorker'

const CLOCK_INTERVAL = Duration.seconds(1)

export const subscriptions = Subscription.make<Model, Message>()(() => ({
  clock: Subscription.persistentEntry(
    Stream.tick(CLOCK_INTERVAL).pipe(
      Stream.mapEffect(() => readClock),
      Stream.map(reading => Message.TickedClock({ reading })),
    ),
  ),
  appUpdate: Subscription.persistentEntry(
    Stream.map(waitingUpdates, () => Message.FoundAppUpdate()),
  ),
}))
