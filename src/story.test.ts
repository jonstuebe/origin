import { Option } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { fromString } from 'foldkit/url'
import { describe, expect, test } from 'vitest'

import {
  FetchArchive,
  FetchFact,
  SaveProgress,
  ScrollToTop,
  ShareResult,
} from './command'
import { FactAsyncData, FetchError, dayProgress, emptyProgress } from './domain'
import { Message, init, update } from './main'
import {
  archiveOnNov6,
  clockOnNov6,
  fact1,
  fact2,
  modelWith,
} from './main.fixture'
import { AppRoute } from './route'

const describeCommands = (
  commands: ReadonlyArray<{ name: string; args?: unknown }> = [],
) => commands.map(({ name, args }) => ({ name, args }))

const url = (path: string) =>
  Option.getOrThrowWith(
    fromString(`https://origin.test${path}`),
    () => new Error(`Failed to parse url: ${path}`),
  )

describe('init', () => {
  test('loads today’s fact on the home page', () => {
    const init_ = init(
      { clock: clockOnNov6, progress: emptyProgress },
      url('/'),
    )
    expect(init_.model.todayFact._tag).toBe('Loading')
    expect(describeCommands(init_.commands)).toEqual([
      { name: 'FetchFact', args: { number: 2 } },
    ])
  })

  test('loads today’s fact and the past one on an edition page', () => {
    const init_ = init(
      { clock: clockOnNov6, progress: emptyProgress },
      url('/no/1'),
    )
    expect(init_.model.route).toEqual(AppRoute.Edition({ number: 1 }))
    expect(describeCommands(init_.commands)).toEqual([
      { name: 'FetchFact', args: { number: 2 } },
      { name: 'FetchFact', args: { number: 1 } },
    ])
  })
})

describe('today', () => {
  test('revealing saves progress and starts the streak', () => {
    story(
      update,
      given(modelWith()),
      message(Message.ClickedReveal()),
      model(model => {
        expect(dayProgress(model.progress, 2).isRevealed).toBe(true)
      }),
      Command.expectHas(SaveProgress),
      Command.resolve(SaveProgress, Message.CompletedSaveProgress()),
    )
  })

  test('a verdict is recorded and sharing sends spoiler-free text', () => {
    story(
      update,
      given(modelWith()),
      message(Message.ClickedReveal()),
      Command.resolve(SaveProgress, Message.CompletedSaveProgress()),
      message(Message.ClickedVerdict({ verdict: 'New' })),
      Command.resolve(SaveProgress, Message.CompletedSaveProgress()),
      message(Message.ClickedShare()),
      Command.expectExact(
        ShareResult({
          text: [
            'Origin No. 2',
            fact2.question,
            'Learned something new ✦',
            'Streak: 1',
            'https://origin.jonstuebe.com',
          ].join('\n'),
        }),
      ),
      Command.resolve(
        ShareResult,
        Message.CompletedShareResult({ outcome: 'Copied' }),
      ),
      model(model => {
        expect(model.maybeShareOutcome).toEqual(Option.some('Copied'))
      }),
    )
  })

  test('a missing fact for today is kept as NotPublished', () => {
    story(
      update,
      given(modelWith({ todayFact: FactAsyncData.Loading() })),
      message(
        Message.FailedFetchFact({
          number: 2,
          error: FetchError.NotPublished(),
        }),
      ),
      model(model => {
        expect(model.todayFact).toEqual(
          FactAsyncData.Failure({ error: FetchError.NotPublished() }),
        )
      }),
    )
  })

  test('at midnight the next fact loads', () => {
    story(
      update,
      given(modelWith()),
      message(
        Message.TickedClock({
          reading: {
            today: { year: 2026, month: 11, day: 7 },
            secondsUntilMidnight: 86_400,
          },
        }),
      ),
      model(model => {
        expect(model.todayFact._tag).toBe('Loading')
      }),
      Command.expectExact(FetchFact({ number: 3 })),
      Command.resolve(
        FetchFact,
        Message.FailedFetchFact({ number: 3, error: FetchError.Unreachable() }),
      ),
    )
  })

  test('an ordinary tick only updates the countdown', () => {
    story(
      update,
      given(modelWith()),
      message(
        Message.TickedClock({
          reading: { today: clockOnNov6.today, secondsUntilMidnight: 10 },
        }),
      ),
      Command.expectNone(),
      model(model => {
        expect(model.clock.secondsUntilMidnight).toBe(10)
      }),
    )
  })
})

describe('navigation', () => {
  test('opening the archives fetches them once', () => {
    story(
      update,
      given(modelWith()),
      message(Message.ChangedUrl({ url: url('/archive') })),
      Command.expectExact(ScrollToTop(), FetchArchive({ number: 2 })),
      Command.resolve(ScrollToTop, Message.CompletedScrollToTop()),
      Command.resolve(
        FetchArchive,
        Message.SucceededFetchArchive({ archive: archiveOnNov6 }),
      ),
      message(Message.ChangedUrl({ url: url('/') })),
      Command.resolve(ScrollToTop, Message.CompletedScrollToTop()),
      message(Message.ChangedUrl({ url: url('/archive') })),
      Command.expectExact(ScrollToTop()),
      Command.resolve(ScrollToTop, Message.CompletedScrollToTop()),
    )
  })

  test('a late response for a page the reader left is ignored', () => {
    story(
      update,
      given(
        modelWith({
          route: AppRoute.Edition({ number: 1 }),
          pastFact: FactAsyncData.Loading(),
        }),
      ),
      message(Message.ChangedUrl({ url: url('/archive') })),
      Command.resolveAll(
        [ScrollToTop, Message.CompletedScrollToTop()],
        [
          FetchArchive,
          Message.SucceededFetchArchive({ archive: archiveOnNov6 }),
        ],
      ),
      message(Message.SucceededFetchFact({ fact: fact1 })),
      model(model => {
        expect(model.pastFact._tag).toBe('Loading')
      }),
    )
  })

  test('a verdict on a past edition is recorded against that edition', () => {
    story(
      update,
      given(
        modelWith({
          route: AppRoute.Edition({ number: 1 }),
          pastFact: FactAsyncData.Success({ data: fact1 }),
        }),
      ),
      message(Message.ClickedVerdict({ verdict: 'Knew' })),
      model(model => {
        expect(dayProgress(model.progress, 1).maybeVerdict).toEqual(
          Option.some('Knew'),
        )
        expect(dayProgress(model.progress, 1).isRevealed).toBe(false)
      }),
      Command.resolve(SaveProgress, Message.CompletedSaveProgress()),
    )
  })
})
