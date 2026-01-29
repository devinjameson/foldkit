import { KeyValueStore } from '@effect/platform'
import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Effect, Match as M, Option, Schema as S } from 'effect'
import { Runtime } from 'foldkit'
import { replaceUrl } from 'foldkit/navigation'
import { Url } from 'foldkit/url'

import { SESSION_STORAGE_KEY } from './constant'
import { Session } from './domain/session'
import { LinkClicked, Message, NoOp, UrlChanged } from './message'
import { LoggedIn, LoggedOut, Model } from './model'
import {
  DashboardRoute,
  LoginRoute,
  dashboardRouter,
  isLoggedInRoute,
  isLoggedOutRoute,
  isProtectedRoute,
  isPublicOnlyRoute,
  loginRouter,
  urlToAppRoute,
} from './route'
import { update } from './update'
import { view } from './view'

const Flags = S.Struct({
  session: S.Option(Session),
})

type Flags = typeof Flags.Type

type InitResult = [Model, ReadonlyArray<Runtime.Command<Message>>]

const init: Runtime.ApplicationInit<Model, Message, Flags> = (
  flags: Flags,
  url: Url,
) => {
  const route = urlToAppRoute(url)

  return Option.match(flags.session, {
    onNone: () =>
      M.value(route).pipe(
        M.withReturnType<InitResult>(),
        M.when(isProtectedRoute, () => [
          LoggedOut.init(LoginRoute.make()),
          [replaceUrl(loginRouter.build({})).pipe(Effect.as(NoOp.make()))],
        ]),
        M.when(isLoggedOutRoute, (route) => [LoggedOut.init(route), []]),
        M.orElse(() => [
          LoggedOut.init(LoginRoute.make()),
          [replaceUrl(loginRouter.build({})).pipe(Effect.as(NoOp.make()))],
        ]),
      ),
    onSome: (session) =>
      M.value(route).pipe(
        M.withReturnType<InitResult>(),
        M.when(isLoggedInRoute, (route) => [LoggedIn.init(route, session), []]),
        M.when(isPublicOnlyRoute, () => [
          LoggedIn.init(DashboardRoute.make(), session),
          [replaceUrl(dashboardRouter.build({})).pipe(Effect.as(NoOp.make()))],
        ]),
        M.orElse(() => [
          LoggedIn.init(DashboardRoute.make(), session),
          [replaceUrl(dashboardRouter.build({})).pipe(Effect.as(NoOp.make()))],
        ]),
      ),
  })
}

const flags: Effect.Effect<Flags> = Effect.gen(function* () {
  const store = yield* KeyValueStore.KeyValueStore
  const maybeSessionJson = yield* store.get(SESSION_STORAGE_KEY)
  const sessionJson = yield* maybeSessionJson

  const decodeSession = S.decode(S.parseJson(Session))
  const session = yield* decodeSession(sessionJson)

  return { session: Option.some(session) }
}).pipe(
  Effect.catchAll(() => Effect.succeed({ session: Option.none() })),
  Effect.provide(BrowserKeyValueStore.layerLocalStorage),
)

const app = Runtime.makeApplication({
  Model,
  Flags,
  flags,
  init,
  update,
  view,
  container: document.getElementById('root')!,
  browser: {
    onUrlRequest: (request) => LinkClicked.make({ request }),
    onUrlChange: (url) => UrlChanged.make({ url }),
  },
})

Runtime.run(app)
