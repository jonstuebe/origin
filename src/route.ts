import { Schema, pipe } from 'effect'
import { Route } from 'foldkit'
import { defineRouteUnion, int, literal, slash } from 'foldkit/route'

export const AppRoute = defineRouteUnion({
  Today: {},
  Archive: {},
  Edition: { number: Schema.Number },
  NotFound: { path: Schema.String },
})
export type AppRoute = typeof AppRoute.Type

export const todayRouter = pipe(Route.root, Route.mapTo(AppRoute.Today))

export const archiveRouter = pipe(
  literal('archive'),
  Route.mapTo(AppRoute.Archive),
)

export const editionRouter = pipe(
  literal('no'),
  slash(int('number')),
  Route.mapTo(AppRoute.Edition),
)

export const urlToAppRoute = Route.parseUrlWithFallback(
  Route.oneOf(editionRouter, archiveRouter, todayRouter),
  AppRoute.NotFound,
)
