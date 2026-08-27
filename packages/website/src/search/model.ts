import { Match as M, Schema as S } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

import { Dialog } from '@foldkit/ui'

import { SearchResult } from './message'

const Results = S.Array(SearchResult)

export const SearchState = defineTaggedUnion({
  Idle: {},
  Loading: { results: Results },
  Ok: { results: Results },
})
export type SearchState = typeof SearchState.Type

export const resultsFromState = (
  state: SearchState,
): ReadonlyArray<typeof SearchResult.Type> =>
  M.value(state).pipe(
    M.tag('Ok', ({ results }) => results),
    M.tag('Loading', ({ results }) => results),
    M.orElse(() => []),
  )

export const Model = S.Struct({
  dialog: Dialog.Model,
  query: S.String,
  searchState: SearchState,
  activeResultIndex: S.Number,
})
export type Model = typeof Model.Type
