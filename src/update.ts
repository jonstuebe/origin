import { Array, Option } from 'effect'
import { AsyncData, Calendar, Update } from 'foldkit'
import { UrlRequest } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'
import { toString as urlToString } from 'foldkit/url'

import {
  ActivateUpdate,
  FetchArchive,
  FetchFact,
  LoadExternal,
  NavigateInternal,
  SaveProgress,
  ScrollToTop,
  ShareResult,
} from './command'
import {
  AppUpdate,
  ArchiveAsyncData,
  type DayProgress,
  FactAsyncData,
  type FactState,
  type Progress,
  type Verdict,
  dayProgress,
  streak,
  updateDay,
} from './domain'
import { todayNumber } from './edition'
import { Message } from './message'
import { type Model } from './model'
import { AppRoute, urlToAppRoute } from './route'
import { shareText } from './share'

type UpdateReturn = Update.Return<Model, Message>
type Step = Update.Step<Model, Message>

/** The edition the current page shows, if it shows one. */
export const viewedNumber = (model: Model): Option.Option<number> =>
  AppRoute.match(model.route, {
    Today: () => Option.some(todayNumber(model.clock.today)),
    Edition: ({ number }) => Option.some(number),
    Archive: () => Option.none(),
    NotFound: () => Option.none(),
  })

/** True when an edition number is a past edition the reader can open. */
export const isPastEdition = (model: Model, number: number): boolean =>
  number >= 1 && number < todayNumber(model.clock.today)

const hasFactFor = (number: number) => (fact: FactState) =>
  Option.exists(AsyncData.getData(fact), data => data.number === number)

const loadTodayFact: Step = model => {
  const number = todayNumber(model.clock.today)
  if (
    hasFactFor(number)(model.todayFact) ||
    AsyncData.isPending(model.todayFact)
  ) {
    return { model }
  }
  return {
    model: modifyFields(model, { todayFact: () => FactAsyncData.Loading() }),
    commands: [FetchFact({ number })],
  }
}

const loadPastFact =
  (number: number): Step =>
  model => {
    if (!isPastEdition(model, number) || hasFactFor(number)(model.pastFact)) {
      return { model }
    }
    return {
      model: modifyFields(model, { pastFact: () => FactAsyncData.Loading() }),
      commands: [FetchFact({ number })],
    }
  }

const loadArchive: Step = model => {
  const number = todayNumber(model.clock.today)
  const isCurrent = Option.exists(
    AsyncData.getData(model.archive),
    archive => archive.number === number,
  )
  if (isCurrent || number <= 1) {
    return { model }
  }
  return {
    model: modifyFields(model, { archive: () => ArchiveAsyncData.Loading() }),
    commands: [FetchArchive({ number })],
  }
}

const keepModel: Step = model => ({ model })

/** Loads whatever the current route needs that isn't loaded yet. Today's fact is always kept current. */
export const loadForRoute: Step = model =>
  Update.combine(model, [
    loadTodayFact,
    AppRoute.match<Step>(model.route, {
      Today: () => keepModel,
      Edition: ({ number }) => loadPastFact(number),
      Archive: () => loadArchive,
      NotFound: () => keepModel,
    }),
  ])

const changeProgress = (
  model: Model,
  number: number,
  change: (day: DayProgress) => DayProgress,
): UpdateReturn => {
  const progress: Progress = updateDay(number, change)(model.progress)
  return {
    model: modifyFields(model, {
      progress: () => progress,
      maybeShareOutcome: () => Option.none(),
    }),
    commands: [SaveProgress({ progress })],
  }
}

const recordVerdict =
  (verdict: Verdict) =>
  (day: DayProgress): DayProgress => ({
    isRevealed: day.isRevealed,
    maybeVerdict: Option.some(verdict),
  })

const reveal = (day: DayProgress): DayProgress => ({
  isRevealed: true,
  maybeVerdict: day.maybeVerdict,
})

/** The fact shown for an edition number, if it is loaded. */
export const factFor = (model: Model, number: number) =>
  Array.findFirst([model.todayFact, model.pastFact], hasFactFor(number)).pipe(
    Option.flatMap(AsyncData.getData),
  )

const settleFact = (
  model: Model,
  number: number,
  settled: FactState,
): UpdateReturn => {
  if (number === todayNumber(model.clock.today)) {
    return { model: modifyFields(model, { todayFact: () => settled }) }
  }
  const isViewed = Option.exists(
    viewedNumber(model),
    viewed => viewed === number,
  )
  return isViewed
    ? { model: modifyFields(model, { pastFact: () => settled }) }
    : { model }
}

const retry: Step = model =>
  loadForRoute(
    modifyFields(model, {
      todayFact: fact =>
        AsyncData.isFailure(fact) ? FactAsyncData.Idle() : fact,
      pastFact: fact =>
        AsyncData.isFailure(fact) ? FactAsyncData.Idle() : fact,
      archive: archive =>
        AsyncData.isFailure(archive) ? ArchiveAsyncData.Idle() : archive,
    }),
  )

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedLink: ({ request }) =>
      UrlRequest.match<UpdateReturn>(request, {
        Internal: ({ url }) => ({
          model,
          commands: [NavigateInternal({ url: urlToString(url) })],
        }),
        External: ({ href }) => ({
          model,
          commands: [LoadExternal({ href })],
        }),
      }),

    ChangedUrl: ({ url }) =>
      Update.combine(model, [
        stepModel => ({
          model: modifyFields(stepModel, {
            route: () => urlToAppRoute(url),
            maybeShareOutcome: () => Option.none(),
          }),
          commands: [ScrollToTop()],
        }),
        loadForRoute,
      ]),

    CompletedNavigateInternal: () => ({ model }),
    CompletedLoadExternal: () => ({ model }),
    CompletedScrollToTop: () => ({ model }),
    CompletedSaveProgress: () => ({ model }),

    ClickedReveal: () =>
      changeProgress(model, todayNumber(model.clock.today), reveal),

    ClickedVerdict: ({ verdict }) =>
      Option.match(viewedNumber(model), {
        onNone: () => ({ model }),
        onSome: number => changeProgress(model, number, recordVerdict(verdict)),
      }),

    ClickedShare: () =>
      Option.match(
        Option.flatMap(viewedNumber(model), number => factFor(model, number)),
        {
          onNone: () => ({ model }),
          onSome: fact => ({
            model: modifyFields(model, {
              maybeShareOutcome: () => Option.none(),
            }),
            commands: [
              ShareResult({
                text: shareText(
                  fact,
                  dayProgress(model.progress, fact.number),
                  streak(model.progress, todayNumber(model.clock.today)),
                ),
              }),
            ],
          }),
        },
      ),

    CompletedShareResult: ({ outcome }) => ({
      model: modifyFields(model, {
        maybeShareOutcome: () => Option.some(outcome),
      }),
    }),

    ClickedRetry: () => retry(model),

    TickedClock: ({ reading }) => {
      const isNewDay = !Calendar.isEqual(reading.today, model.clock.today)
      const nextModel = modifyFields(model, { clock: () => reading })
      return isNewDay ? loadForRoute(nextModel) : { model: nextModel }
    },

    SucceededFetchFact: ({ fact }) =>
      settleFact(model, fact.number, FactAsyncData.Success({ data: fact })),

    FailedFetchFact: ({ number, error }) =>
      settleFact(model, number, FactAsyncData.Failure({ error })),

    SucceededFetchArchive: ({ archive }) => ({
      model: modifyFields(model, {
        archive: () => ArchiveAsyncData.Success({ data: archive }),
      }),
    }),

    FoundAppUpdate: () => ({
      model: modifyFields(model, {
        appUpdate: current =>
          AppUpdate.match(current, {
            Current: () => AppUpdate.Available(),
            Available: () => current,
            Dismissed: () => AppUpdate.Available(),
            Applying: () => current,
          }),
      }),
    }),

    ClickedReloadForUpdate: () => ({
      model: modifyFields(model, { appUpdate: () => AppUpdate.Applying() }),
      commands: [ActivateUpdate()],
    }),

    ClickedDismissUpdate: () => ({
      model: modifyFields(model, { appUpdate: () => AppUpdate.Dismissed() }),
    }),

    CompletedActivateUpdate: () => ({ model }),

    FailedFetchArchive: ({ error }) => ({
      model: modifyFields(model, {
        archive: () => ArchiveAsyncData.Failure({ error }),
      }),
    }),
  })
