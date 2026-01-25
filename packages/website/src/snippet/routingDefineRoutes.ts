import { Schema as S } from 'effect'
import { ts } from 'foldkit/schema'

const HomeRoute = ts('Home')
const PeopleRoute = ts('People', { searchText: S.Option(S.String) })
const PersonRoute = ts('Person', { personId: S.Number })
const NotFoundRoute = ts('NotFound', { path: S.String })

const AppRoute = S.Union(
  HomeRoute,
  PeopleRoute,
  PersonRoute,
  NotFoundRoute,
)

type AppRoute = typeof AppRoute.Type
