import { Effect, Schema } from 'effect'
import { HttpClient, HttpClientRequest } from 'effect/http'
import { KeyValueStore } from 'effect/persistence'
import { Command, Http } from 'foldkit'
import { load, pushUrl } from 'foldkit/navigation'

import { BrowserKeyValueStore } from '@effect/platform-browser'

import {
  Archive,
  ArchiveEntry,
  Fact,
  FetchError,
  Progress,
  ProgressJsonString,
} from './domain'
import { Message, type ShareOutcome } from './message'

export const PROGRESS_STORAGE_KEY = 'origin:v1'

const NOT_FOUND = 404

const isFetchError = Schema.is(FetchError)

const getJson = <A>(path: string, schema: Schema.Codec<A>) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const response = yield* client.execute(HttpClientRequest.get(path))
    if (response.status === NOT_FOUND) {
      return yield* Effect.fail(FetchError.NotPublished())
    }
    if (response.status !== 200) {
      return yield* Effect.fail(FetchError.Unreachable())
    }
    return yield* Schema.decodeUnknownEffect(schema)(yield* response.json)
  }).pipe(
    Effect.mapError(error =>
      isFetchError(error) ? error : FetchError.Unreachable(),
    ),
    Effect.provide(Http.layer),
  )

export const FetchFact = Command.define('FetchFact', {
  args: { number: Schema.Number },
  messages: [Message.SucceededFetchFact, Message.FailedFetchFact],
  execute: ({ number }) =>
    getJson(`/api/fact/${number}`, Fact).pipe(
      Effect.match({
        onFailure: error => Message.FailedFetchFact({ number, error }),
        onSuccess: fact => Message.SucceededFetchFact({ fact }),
      }),
    ),
})

const ArchiveResponse = Schema.Struct({ entries: Schema.Array(ArchiveEntry) })

export const FetchArchive = Command.define('FetchArchive', {
  args: { number: Schema.Number },
  messages: [Message.SucceededFetchArchive, Message.FailedFetchArchive],
  execute: ({ number }) =>
    getJson(`/api/archive/${number}`, ArchiveResponse).pipe(
      Effect.match({
        onFailure: error => Message.FailedFetchArchive({ number, error }),
        onSuccess: ({ entries }) =>
          Message.SucceededFetchArchive({
            archive: Archive.make({ number, entries }),
          }),
      }),
    ),
})

export const SaveProgress = Command.define('SaveProgress', {
  args: { progress: Progress },
  messages: [Message.CompletedSaveProgress],
  execute: ({ progress }) =>
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
      const encoded = yield* Schema.encodeEffect(ProgressJsonString)(progress)
      yield* store.set(PROGRESS_STORAGE_KEY, encoded)
      return Message.CompletedSaveProgress()
    }).pipe(
      Effect.catch(() => Effect.succeed(Message.CompletedSaveProgress())),
      Effect.provide(BrowserKeyValueStore.layerLocalStorage),
    ),
})

const failedShareOutcome = (error: unknown): ShareOutcome =>
  error instanceof DOMException && error.name === 'AbortError'
    ? 'Cancelled'
    : 'Failed'

export const ShareResult = Command.define('ShareResult', {
  args: { text: Schema.String },
  messages: [Message.CompletedShareResult],
  execute: ({ text }) =>
    Effect.tryPromise({
      try: async () => {
        if (typeof navigator.share === 'function') {
          await navigator.share({ text })
          return 'Shared' as const
        }
        await navigator.clipboard.writeText(text)
        return 'Copied' as const
      },
      catch: failedShareOutcome,
    }).pipe(
      Effect.match({
        onFailure: outcome => Message.CompletedShareResult({ outcome }),
        onSuccess: outcome => Message.CompletedShareResult({ outcome }),
      }),
    ),
})

export const NavigateInternal = Command.define('NavigateInternal', {
  args: { url: Schema.String },
  messages: [Message.CompletedNavigateInternal],
  execute: ({ url }) =>
    pushUrl(url).pipe(Effect.as(Message.CompletedNavigateInternal())),
})

export const LoadExternal = Command.define('LoadExternal', {
  args: { href: Schema.String },
  messages: [Message.CompletedLoadExternal],
  execute: ({ href }) =>
    load(href).pipe(Effect.as(Message.CompletedLoadExternal())),
})

export const ScrollToTop = Command.define('ScrollToTop', {
  messages: [Message.CompletedScrollToTop],
  execute: Effect.sync(() => window.scrollTo(0, 0)).pipe(
    Effect.as(Message.CompletedScrollToTop()),
  ),
})
