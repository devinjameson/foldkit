import { Effect, Match as M, Schema as S, pipe } from 'effect'
import { Command, Navigation, Route, type Update, Url } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { defineRouteUnion, int, literal, slash } from 'foldkit/route'
import { evo } from 'foldkit/struct'

// ROUTE

const AppRoute = defineRouteUnion({
  Home: {},
  Person: { personId: S.Number },
  NotFound: { path: S.String },
})
type AppRoute = typeof AppRoute.Type

const homeRouter = pipe(Route.root, Route.mapTo(AppRoute.Home))
const personRouter = pipe(
  literal('people'),
  slash(int('personId')),
  Route.mapTo(AppRoute.Person),
)
const routeParser = Route.oneOf(personRouter, homeRouter)
const urlToAppRoute = Route.parseUrlWithFallback(routeParser, AppRoute.NotFound)

// MODEL

const Model = S.Struct({ route: AppRoute })
type Model = typeof Model.Type

// MESSAGE

const Message = defineMessageUnion({
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
  ClickedLink: { request: Navigation.UrlRequest },
  ChangedUrl: { url: Url.Url },
})
type Message = typeof Message.Type

// COMMAND

const NavigateInternal = Command.define('NavigateInternal', {
  args: { url: S.String },
  messages: [Message.CompletedNavigateInternal],
  execute: ({ url }) =>
    Navigation.pushUrl(url).pipe(
      Effect.as(Message.CompletedNavigateInternal()),
    ),
})

const LoadExternal = Command.define('LoadExternal', {
  args: { href: S.String },
  messages: [Message.CompletedLoadExternal],
  execute: ({ href }) =>
    Navigation.load(href).pipe(Effect.as(Message.CompletedLoadExternal())),
})

// UPDATE

type UpdateReturn = Update.Return<Model, Message>

const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    CompletedNavigateInternal: () => ({ model }),
    CompletedLoadExternal: () => ({ model }),

    ClickedLink: ({ request }) =>
      M.value(request).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
          Internal: ({ url }) => ({
            model,
            commands: [NavigateInternal({ url: Url.toString(url) })],
          }),
          External: ({ href }) => ({
            model,
            commands: [LoadExternal({ href })],
          }),
        }),
      ),

    ChangedUrl: ({ url }) => ({
      model: evo(model, {
        route: () => urlToAppRoute(url),
      }),
    }),
  })
