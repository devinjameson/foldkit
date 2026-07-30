import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { FetchSearchResults, NavigateToResult, ScrollToResult } from './command'
import { init } from './init'
import {
  ClearedSearchQuery,
  CompletedFetchSearchResults,
  CompletedNavigateToResult,
  CompletedScrollToResult,
  PressedArrowKey,
  SelectedSearchResult,
  UpdatedSearchQuery,
} from './message'
import { Ok } from './model'
import { update } from './update'

const [initialModel] = init()

const searchResults = [
  {
    url: '/docs/commands',
    title: 'Commands',
    excerpt: 'Side effects...',
    section: 'Core',
    kind: '',
  },
  {
    url: '/docs/testing',
    title: 'Testing',
    excerpt: 'Pure tests...',
    section: 'Core',
    kind: '',
  },
]

describe('search', () => {
  test('typing a query starts a search', () => {
    story(
      update,
      given(initialModel),
      message(UpdatedSearchQuery({ query: 'routing' })),
      model(model => {
        expect(model.query).toBe('routing')
        expect(model.searchState._tag).toBe('Loading')
      }),
      Command.expectHas(FetchSearchResults),
      Command.resolve(
        FetchSearchResults,
        CompletedFetchSearchResults({
          results: searchResults,
          query: 'routing',
        }),
      ),
      model(model => {
        expect(model.searchState).toMatchObject({
          _tag: 'Ok',
          results: searchResults,
        })
        expect(model.activeResultIndex).toBe(0)
      }),
    )
  })

  test('clearing the query resets to Idle', () => {
    story(
      update,
      given({ ...initialModel, query: 'routing' }),
      message(UpdatedSearchQuery({ query: '' })),
      model(model => {
        expect(model.query).toBe('')
        expect(model.searchState._tag).toBe('Idle')
        expect(model.activeResultIndex).toBe(-1)
      }),
      Command.expectNone(),
    )
  })

  test('same query is ignored', () => {
    story(
      update,
      given({ ...initialModel, query: 'routing' }),
      message(UpdatedSearchQuery({ query: 'routing' })),
      model(model => {
        expect(model.searchState._tag).toBe('Idle')
      }),
      Command.expectNone(),
    )
  })

  test('new query preserves previous results in Loading state', () => {
    story(
      update,
      given({
        ...initialModel,
        query: 'routing',
        searchState: Ok({ results: searchResults }),
      }),
      message(UpdatedSearchQuery({ query: 'testing' })),
      model(model => {
        expect(model.query).toBe('testing')
        expect(model.searchState._tag).toBe('Loading')
        expect(model.searchState).toMatchObject({
          _tag: 'Loading',
          results: searchResults,
        })
      }),
      Command.resolve(
        FetchSearchResults,
        CompletedFetchSearchResults({ results: [], query: 'testing' }),
      ),
    )
  })

  test('stale results are ignored', () => {
    story(
      update,
      given({ ...initialModel, query: 'testing' }),
      message(
        CompletedFetchSearchResults({
          results: searchResults,
          query: 'routing',
        }),
      ),
      model(model => {
        expect(model.searchState._tag).toBe('Idle')
      }),
    )
  })

  test('selecting a result navigates and resets', () => {
    story(
      update,
      given(initialModel),
      message(SelectedSearchResult({ url: '/docs/commands' })),
      model(model => {
        expect(model.query).toBe('')
        expect(model.searchState._tag).toBe('Idle')
      }),
      Command.expectHas(NavigateToResult),
      Command.resolve(NavigateToResult, CompletedNavigateToResult()),
      model(model => {
        expect(model.query).toBe('')
      }),
    )
  })

  test('arrow keys cycle through results', () => {
    const modelWithResults = {
      ...initialModel,
      searchState: Ok({ results: searchResults }),
      activeResultIndex: 0,
    }

    story(
      update,
      given(modelWithResults),
      message(PressedArrowKey({ direction: 'Down' })),
      model(model => {
        expect(model.activeResultIndex).toBe(1)
      }),
      Command.expectHas(ScrollToResult),
      Command.resolve(ScrollToResult, CompletedScrollToResult()),
      message(PressedArrowKey({ direction: 'Down' })),
      model(model => {
        expect(model.activeResultIndex).toBe(0)
      }),
      Command.resolve(ScrollToResult, CompletedScrollToResult()),
      message(PressedArrowKey({ direction: 'Up' })),
      model(model => {
        expect(model.activeResultIndex).toBe(1)
      }),
      Command.resolve(ScrollToResult, CompletedScrollToResult()),
    )
  })

  test('clearing the query explicitly resets state', () => {
    story(
      update,
      given({
        ...initialModel,
        query: 'routing',
        searchState: Ok({ results: searchResults }),
        activeResultIndex: 1,
      }),
      message(ClearedSearchQuery()),
      model(model => {
        expect(model.query).toBe('')
        expect(model.searchState._tag).toBe('Idle')
        expect(model.activeResultIndex).toBe(-1)
      }),
    )
  })
})
