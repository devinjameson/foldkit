import { Schema as S } from 'effect'
import { defineRouteUnion } from 'foldkit/route'

const AppRoute = defineRouteUnion({
  Home: {},
  People: { searchText: S.Option(S.String) },
  Person: { personId: S.Number },
  NotFound: { path: S.String },
})

type AppRoute = typeof AppRoute.Type
