import clsx from 'clsx'
import { Array, Option } from 'effect'
import { AsyncData } from 'foldkit'
import { Document, Html, HtmlBuilder } from 'foldkit/html'

import {
  AppUpdate,
  type ArchiveEntry,
  type DayProgress,
  type Fact,
  type FactState,
  FetchError,
  type Verdict,
  countVerdicts,
  dayProgress,
  streak,
} from './domain'
import { editionDateKey, todayNumber } from './edition'
import { countdown, longDate, shortDate } from './format'
import { Message } from './message'
import { type Model } from './model'
import { AppRoute, archiveRouter, editionRouter, todayRouter } from './route'

type H = HtmlBuilder<Message>

const VERDICTS: ReadonlyArray<{ verdict: Verdict; label: string }> = [
  { verdict: 'Knew', label: 'I knew it' },
  { verdict: 'New', label: 'New to me' },
]

// HEADER

const headerView = (maybeNumber: Option.Option<number>, h: H): Html =>
  h.header(
    [],
    [
      h.h1([h.Class('brand')], [h.a([h.Href(todayRouter())], ['Origin'])]),
      Option.match(maybeNumber, {
        onNone: () => h.empty,
        onSome: number =>
          h.p(
            [h.Class('meta')],
            [
              h.span([h.Class('no')], [`No. ${number}`]),
              ' ',
              h.span([], [longDate(editionDateKey(number))]),
            ],
          ),
      }),
    ],
  )

// EDITION

const verdictView = (fact: Fact, day: DayProgress, model: Model, h: H): Html =>
  h.div(
    [h.Class('verdict')],
    [
      h.p([], ['Did you already know this?']),
      h.div(
        [h.Class('vbtns')],
        Array.map(VERDICTS, ({ verdict, label }) => {
          const isOn = Option.exists(
            day.maybeVerdict,
            marked => marked === verdict,
          )
          return h.keyed('button')(
            verdict,
            [
              h.Type('button'),
              h.Class(clsx({ on: isOn })),
              h.AriaPressed(isOn ? 'true' : 'false'),
              h.OnClick(Message.ClickedVerdict({ verdict })),
            ],
            [label],
          )
        }),
      ),
      Option.match(day.maybeVerdict, {
        onNone: () => h.empty,
        onSome: () =>
          h.p(
            [h.Class('share-row')],
            [
              h.button(
                [
                  h.Type('button'),
                  h.Class('share link'),
                  h.OnClick(Message.ClickedShare()),
                ],
                [
                  fact.number === todayNumber(model.clock.today)
                    ? 'Share today’s result'
                    : 'Share this one',
                ],
              ),
              h.span(
                [h.Class('toast'), h.AriaLive('polite')],
                [toastText(model)],
              ),
            ],
          ),
      }),
    ],
  )

const toastText = (model: Model): string =>
  Option.match(model.maybeShareOutcome, {
    onNone: () => '',
    onSome: outcome =>
      outcome === 'Copied'
        ? 'Copied'
        : outcome === 'Failed'
          ? 'Couldn’t share. Try again.'
          : '',
  })

const answerView = (fact: Fact, day: DayProgress, model: Model, h: H): Html =>
  h.div(
    [h.Class('answer')],
    [
      h.hr([h.Class('rule')]),
      h.p([h.Class('headline')], [fact.headline]),
      h.p([h.Class('body')], [fact.body]),
      verdictView(fact, day, model, h),
    ],
  )

const guessView = (h: H): Html =>
  h.div(
    [],
    [
      h.p([h.Class('hint')], ['Take a guess before you look.']),
      h.button(
        [
          h.Type('button'),
          h.Class('reveal link'),
          h.OnClick(Message.ClickedReveal()),
        ],
        ['Reveal the answer'],
      ),
    ],
  )

const backLinksView = (h: H): Html =>
  h.nav(
    [h.Class('backs'), h.AriaLabel('Back')],
    [
      h.a([h.Class('link'), h.Href(archiveRouter())], ['Back to archives']),
      h.a([h.Class('link'), h.Href(todayRouter())], ['Today’s question']),
    ],
  )

const factView = (fact: Fact, model: Model, h: H): Html => {
  const day = dayProgress(model.progress, fact.number)
  const isToday = fact.number === todayNumber(model.clock.today)
  const isAnswerShown = day.isRevealed || !isToday
  return h.section(
    [],
    [
      h.h2([h.Class('q')], [fact.question]),
      isAnswerShown ? answerView(fact, day, model, h) : guessView(h),
      isToday ? h.empty : backLinksView(h),
    ],
  )
}

const messageView = (
  title: string,
  detail: string,
  maybeAction: Option.Option<Html>,
  h: H,
): Html =>
  h.section(
    [],
    [
      h.h2([h.Class('q')], [title]),
      h.p([h.Class('hint')], [detail]),
      Option.getOrElse(maybeAction, () => h.empty),
    ],
  )

const retryButton = (h: H): Html =>
  h.button(
    [
      h.Type('button'),
      h.Class('reveal link'),
      h.OnClick(Message.ClickedRetry()),
    ],
    ['Try again'],
  )

const todayLink = (h: H): Html =>
  h.p(
    [h.Class('reveal')],
    [h.a([h.Class('link'), h.Href(todayRouter())], ['Today’s question'])],
  )

const loadingView = (h: H): Html =>
  h.section([h.AriaBusy(true)], [h.p([h.Class('hint')], ['Loading…'])])

const factStateView = (
  factState: FactState,
  number: number,
  model: Model,
  h: H,
): Html => {
  const isToday = number === todayNumber(model.clock.today)
  const failureView = (error: FetchError): Html =>
    FetchError.match(error, {
      NotPublished: () =>
        isToday
          ? messageView(
              'Nothing new today.',
              'Back tomorrow.',
              Option.none(),
              h,
            )
          : messageView(
              'That one isn’t out yet.',
              'Check back on its day.',
              Option.some(todayLink(h)),
              h,
            ),
      Unreachable: () =>
        messageView(
          'Couldn’t reach Origin.',
          'Check your connection and try again.',
          Option.some(retryButton(h)),
          h,
        ),
    })
  const dataView = (fact: Fact): Html =>
    fact.number === number ? factView(fact, model, h) : loadingView(h)
  return AsyncData.match(factState, {
    onIdle: () => loadingView(h),
    onLoading: () => loadingView(h),
    onRefreshing: dataView,
    onFailure: failureView,
    onStale: ({ data }) => dataView(data),
    onSuccess: dataView,
  })
}

const editionView = (number: number, model: Model, h: H): Html => {
  const today = todayNumber(model.clock.today)
  if (number === today) {
    return factStateView(model.todayFact, number, model, h)
  }
  if (number > today || number < 1) {
    return messageView(
      'That one isn’t out yet.',
      'Check back on its day.',
      Option.some(todayLink(h)),
      h,
    )
  }
  return factStateView(model.pastFact, number, model, h)
}

// STATS

const statsView = (model: Model, h: H): Html =>
  h.section(
    [h.Class('foot'), h.AriaLabel('Your stats')],
    [
      h.span(
        [],
        [
          h.b(
            [],
            [String(streak(model.progress, todayNumber(model.clock.today)))],
          ),
          ' day streak',
        ],
      ),
      h.span(
        [],
        [h.b([], [String(countVerdicts(model.progress, 'New'))]), ' learned'],
      ),
      h.span(
        [],
        [
          h.b([], [String(countVerdicts(model.progress, 'Knew'))]),
          ' already knew',
        ],
      ),
      h.span(
        [h.Class('next')],
        ['Next in ', h.span([], [countdown(model.clock.secondsUntilMidnight)])],
      ),
    ],
  )

const dayPageView = (number: number, model: Model, h: H): Html =>
  h.div(
    [],
    [
      editionView(number, model, h),
      statsView(model, h),
      h.p(
        [h.Class('arch-link')],
        [h.a([h.Class('link'), h.Href(archiveRouter())], ['Archives'])],
      ),
    ],
  )

// ARCHIVE

const archiveEntryView = (entry: ArchiveEntry, h: H): Html =>
  h.keyed('li')(
    String(entry.number),
    [],
    [
      h.a(
        [h.Href(editionRouter({ number: entry.number }))],
        [
          h.span([h.Class('n')], [String(entry.number)]),
          h.span([h.Class('t')], [entry.question]),
          h.span([h.Class('d')], [shortDate(entry.date)]),
        ],
      ),
    ],
  )

const archiveListView = (model: Model, h: H): Html => {
  if (todayNumber(model.clock.today) <= 1) {
    return h.p(
      [h.Class('empty')],
      ['Nothing here yet. Today’s question moves into the archives tomorrow.'],
    )
  }
  return AsyncData.match(model.archive, {
    onIdle: () => h.empty,
    onLoading: () => h.p([h.Class('empty')], ['Loading…']),
    onRefreshing: archive => entriesView(archive.entries, h),
    onFailure: () =>
      h.div(
        [],
        [
          h.p([h.Class('empty')], ['Couldn’t load the archives.']),
          retryButton(h),
        ],
      ),
    onStale: ({ data }) => entriesView(data.entries, h),
    onSuccess: archive => entriesView(archive.entries, h),
  })
}

const entriesView = (entries: ReadonlyArray<ArchiveEntry>, h: H): Html =>
  h.ol(
    [],
    Array.map(entries, entry => archiveEntryView(entry, h)),
  )

const archivePageView = (model: Model, h: H): Html =>
  h.section(
    [h.Class('archive')],
    [
      h.a(
        [h.Class('link back-top'), h.Href(todayRouter())],
        ['Today’s question'],
      ),
      h.h2([h.Class('arch-title')], ['Archives']),
      h.p([h.Class('arch-sub')], ['Every past question. Tap one to read it.']),
      archiveListView(model, h),
    ],
  )

const notFoundView = (h: H): Html =>
  messageView(
    'Nothing here.',
    'That page doesn’t exist.',
    Option.some(todayLink(h)),
    h,
  )

// UPDATE TOAST

const updateToastView = (model: Model, h: H): Html =>
  h.div(
    [h.Class('update-slot'), h.Role('status'), h.AriaLive('polite')],
    [
      AppUpdate.match(model.appUpdate, {
        Current: () => h.empty,
        Dismissed: () => h.empty,
        Available: () =>
          h.div(
            [h.Class('update-toast')],
            [
              h.span(
                [h.Class('update-text')],
                ['A new version of Origin is ready.'],
              ),
              h.span(
                [h.Class('update-actions')],
                [
                  h.button(
                    [
                      h.Type('button'),
                      h.Class('link'),
                      h.OnClick(Message.ClickedReloadForUpdate()),
                    ],
                    ['Reload'],
                  ),
                  h.button(
                    [
                      h.Type('button'),
                      h.Class('later'),
                      h.OnClick(Message.ClickedDismissUpdate()),
                    ],
                    ['Later'],
                  ),
                ],
              ),
            ],
          ),
        Applying: () =>
          h.div(
            [h.Class('update-toast')],
            [h.span([h.Class('update-text')], ['Updating…'])],
          ),
      }),
    ],
  )

// DOCUMENT

const pageView = (
  maybeNumber: Option.Option<number>,
  content: Html,
  model: Model,
  h: H,
): Html =>
  h.div(
    [],
    [
      h.main([], [headerView(maybeNumber, h), content]),
      updateToastView(model, h),
    ],
  )

export const view = (model: Model, h: H): Document => {
  const today = todayNumber(model.clock.today)
  return AppRoute.match(model.route, {
    Today: () => ({
      title: `Origin No. ${today}`,
      body: pageView(
        Option.some(today),
        dayPageView(today, model, h),
        model,
        h,
      ),
    }),
    Edition: ({ number }) => ({
      title: `Origin No. ${number}`,
      body: pageView(
        Option.liftPredicate(
          number,
          candidate => candidate >= 1 && candidate <= today,
        ),
        dayPageView(number, model, h),
        model,
        h,
      ),
    }),
    Archive: () => ({
      title: 'Origin: Archives',
      body: pageView(Option.none(), archivePageView(model, h), model, h),
    }),
    NotFound: () => ({
      title: 'Origin',
      body: pageView(Option.none(), notFoundView(h), model, h),
    }),
  })
}
