import { Effect, Queue, Stream } from 'effect'
import { Workbox } from 'workbox-window'

const SERVICE_WORKER_URL = '/sw.js'

const canUseServiceWorker = (): boolean =>
  import.meta.env.PROD && 'serviceWorker' in navigator

/**
 * Registers the service worker and emits once whenever a new version has
 * installed and is waiting. The waiting version only takes over when the
 * reader accepts it, via `activateWaitingUpdate`.
 */
export const waitingUpdates: Stream.Stream<void> = Stream.callback<void>(
  queue =>
    Effect.sync(() => {
      if (!canUseServiceWorker()) {
        return
      }
      const workbox = new Workbox(SERVICE_WORKER_URL)
      workbox.addEventListener('waiting', () => {
        Queue.offerUnsafe(queue, undefined)
      })
      workbox.register().catch(() => undefined)
    }),
)

const reload = (): void => window.location.reload()

/** Tells the waiting service worker to take over, then reloads onto the new version. */
export const activateWaitingUpdate: Effect.Effect<void> = Effect.tryPromise(
  async () => {
    const registration = await navigator.serviceWorker.getRegistration()
    const waiting = registration?.waiting
    if (!waiting) {
      reload()
      return
    }
    navigator.serviceWorker.addEventListener('controllerchange', reload, {
      once: true,
    })
    waiting.postMessage({ type: 'SKIP_WAITING' })
  },
).pipe(Effect.catch(() => Effect.sync(reload)))
