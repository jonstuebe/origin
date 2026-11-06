import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest } from 'foldkit/navigation'
import { Url } from 'foldkit/url'

import { ClockReading } from './clock'
import { Archive, Fact, FetchError, Verdict } from './domain'

/** How a share attempt ended. */
export const ShareOutcome = Schema.Literals([
  'Shared',
  'Copied',
  'Cancelled',
  'Failed',
])
export type ShareOutcome = typeof ShareOutcome.Type

export const Message = defineMessageUnion({
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
  CompletedScrollToTop: {},
  ClickedReveal: {},
  ClickedVerdict: { verdict: Verdict },
  ClickedShare: {},
  ClickedRetry: {},
  TickedClock: { reading: ClockReading },
  SucceededFetchFact: { fact: Fact },
  FailedFetchFact: { number: Schema.Number, error: FetchError },
  SucceededFetchArchive: { archive: Archive },
  FailedFetchArchive: { number: Schema.Number, error: FetchError },
  CompletedSaveProgress: {},
  CompletedShareResult: { outcome: ShareOutcome },
})
export type Message = typeof Message.Type
