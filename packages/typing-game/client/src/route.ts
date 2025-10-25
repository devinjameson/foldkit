import { Schema as S, pipe } from 'effect'
import { Route } from 'foldkit'
import { literal, slash, string } from 'foldkit/route'
import { ts } from 'foldkit/schema'

const HomeRoute = ts('Home')
const RoomRoute = ts('Room', { roomId: S.String })
const NotFoundRoute = ts('NotFound', { path: S.String })

export const AppRoute = S.Union(HomeRoute, RoomRoute, NotFoundRoute)

export type HomeRoute = typeof HomeRoute.Type
export type RoomRoute = typeof RoomRoute.Type
export type NotFoundRoute = typeof NotFoundRoute.Type

export type AppRoute = typeof AppRoute.Type

export const homeRouter = pipe(Route.root, Route.mapTo(HomeRoute))
export const roomRouter = pipe(literal('room'), slash(string('roomId')), Route.mapTo(RoomRoute))
const routeParser = Route.oneOf(roomRouter, homeRouter)

export const urlToAppRoute = Route.parseUrlWithFallback(routeParser, NotFoundRoute)
