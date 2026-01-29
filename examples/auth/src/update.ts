import { Effect, Match as M } from 'effect'
import { Runtime } from 'foldkit'
import { load, pushUrl, replaceUrl } from 'foldkit/navigation'
import { evo } from 'foldkit/struct'
import { toString as urlToString } from 'foldkit/url'

import { clearSession, saveSession } from './command'
import { Message, NoOp } from './message'
import { LoggedIn, LoggedOut, Model } from './model'
import {
  AppRoute,
  DashboardRoute,
  HomeRoute,
  LoggedInRoute,
  LoggedOutRoute,
  dashboardRouter,
  homeRouter,
  isProtectedRoute,
  isPublicOnlyRoute,
  loginRouter,
  urlToAppRoute,
} from './route'

type UpdateReturn = [Model, ReadonlyArray<Runtime.Command<Message>>]

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      NoOp: () => [model, []],

      LinkClicked: ({ request }) =>
        M.value(request).pipe(
          M.withReturnType<UpdateReturn>(),
          M.tagsExhaustive({
            Internal: ({ url }) => [
              model,
              [pushUrl(urlToString(url)).pipe(Effect.as(NoOp.make()))],
            ],
            External: ({ href }) => [
              model,
              [load(href).pipe(Effect.as(NoOp.make()))],
            ],
          }),
        ),

      UrlChanged: ({ url }) => {
        const route = urlToAppRoute(url)

        return M.value(model).pipe(
          M.withReturnType<UpdateReturn>(),
          M.tagsExhaustive({
            LoggedOut: (loggedOutModel) => {
              if (isProtectedRoute(route)) {
                return [
                  model,
                  [
                    replaceUrl(loginRouter.build({})).pipe(
                      Effect.as(NoOp.make()),
                    ),
                  ],
                ]
              }

              return [
                evo(loggedOutModel, {
                  route: () => toLoggedOutRoute(route),
                }),
                [],
              ]
            },

            LoggedIn: (loggedInModel) => {
              if (isPublicOnlyRoute(route)) {
                return [
                  model,
                  [
                    replaceUrl(dashboardRouter.build({})).pipe(
                      Effect.as(NoOp.make()),
                    ),
                  ],
                ]
              }

              return [
                evo(loggedInModel, {
                  route: () => toLoggedInRoute(route),
                }),
                [],
              ]
            },
          }),
        )
      },

      SessionLoaded: ({ session }) =>
        M.value(session).pipe(
          M.withReturnType<UpdateReturn>(),
          M.tagsExhaustive({
            Some: ({ value }) => [LoggedIn.init(DashboardRoute.make(), value), []],
            None: () => [model, []],
          }),
        ),

      SessionSaved: () => [model, []],

      SessionCleared: () => [model, []],

      LoggedOutMessage: ({ message }) => handleLoggedOutMessage(model, message),

      LoggedInMessage: ({ message }) => handleLoggedInMessage(model, message),
    }),
  )

const handleLoggedOutMessage = (
  model: Model,
  message: LoggedOut.Message,
): UpdateReturn => {
  if (model._tag !== 'LoggedOut') {
    return [model, []]
  }

  const result = LoggedOut.update(model, message)

  return M.value(result).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      ModelUpdated: ({ model: nextModel }) => [nextModel, []],
      LoginSucceeded: ({ session }) => [
        LoggedIn.init(DashboardRoute.make(), session),
        [
          saveSession(session).pipe(Effect.as(NoOp.make())),
          replaceUrl(dashboardRouter.build({})).pipe(Effect.as(NoOp.make())),
        ],
      ],
    }),
  )
}

const handleLoggedInMessage = (
  model: Model,
  message: LoggedIn.Message,
): UpdateReturn => {
  if (model._tag !== 'LoggedIn') {
    return [model, []]
  }

  const result = LoggedIn.update(model, message)

  return M.value(result).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      ModelUpdated: ({ model: nextModel }) => [nextModel, []],
      LogoutRequested: () => [
        LoggedOut.init(HomeRoute.make()),
        [
          clearSession().pipe(Effect.as(NoOp.make())),
          replaceUrl(homeRouter.build({})).pipe(Effect.as(NoOp.make())),
        ],
      ],
    }),
  )
}

const toLoggedOutRoute = (route: AppRoute): LoggedOutRoute =>
  M.value(route).pipe(
    M.withReturnType<LoggedOutRoute>(),
    M.tagsExhaustive({
      Home: (route) => route,
      Login: (route) => route,
      Dashboard: () => HomeRoute.make(),
      Settings: () => HomeRoute.make(),
      NotFound: (route) => route,
    }),
  )

const toLoggedInRoute = (route: AppRoute): LoggedInRoute =>
  M.value(route).pipe(
    M.withReturnType<LoggedInRoute>(),
    M.tagsExhaustive({
      Home: () => DashboardRoute.make(),
      Login: () => DashboardRoute.make(),
      Dashboard: (route) => route,
      Settings: (route) => route,
      NotFound: (route) => route,
    }),
  )
