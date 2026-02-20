import { Schema as S } from 'effect'
import { m } from 'foldkit/schema'

const HomeRoute = m('Home')
const PeopleRoute = m('People', { searchText: S.Option(S.String) })
const PersonRoute = m('Person', { personId: S.Number })
const NotFoundRoute = m('NotFound', { path: S.String })

const AppRoute = S.Union(
  HomeRoute,
  PeopleRoute,
  PersonRoute,
  NotFoundRoute,
)

type AppRoute = typeof AppRoute.Type
