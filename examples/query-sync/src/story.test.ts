import { Option } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { fromString } from 'foldkit/url'
import { describe, expect, test } from 'vitest'

import { Listbox } from '@foldkit/ui'

import {
  Ascending,
  BrowseRoute,
  ChangedSearchInput,
  ChangedUrl,
  ClickedColumnHeader,
  CompletedReplaceFilters,
  GotDietListboxMessage,
  type Model,
  ReplaceFilters,
  Unsorted,
  update,
} from './main'

const browseModel: Model = {
  route: BrowseRoute({
    search: Option.none(),
    sorting: Unsorted(),
    diet: Option.none(),
    period: Option.none(),
  }),
  dietListbox: Listbox.init({ id: 'diet-filter' }),
  periodListbox: Listbox.init({ id: 'period-filter' }),
}

const urlOrThrow = (raw: string) =>
  Option.getOrThrowWith(
    fromString(raw),
    () => new Error(`Failed to parse url: ${raw}`),
  )

describe('update', () => {
  describe('ChangedUrl', () => {
    test('parses search, sorting, diet, and period from the URL', () => {
      story(
        update,
        given(browseModel),
        message(
          ChangedUrl({
            url: urlOrThrow(
              'http://localhost/?search=raptor&sorting=Length:Ascending&diet=Carnivore&period=Cretaceous',
            ),
          }),
        ),
        model(model => {
          if (model.route._tag !== 'Browse') {
            throw new Error('Expected Browse route')
          }
          expect(model.route.search).toStrictEqual(Option.some('raptor'))
          expect(model.route.sorting).toStrictEqual(
            Ascending({ column: 'Length' }),
          )
          expect(model.route.diet).toStrictEqual(Option.some('Carnivore'))
          expect(model.route.period).toStrictEqual(Option.some('Cretaceous'))
        }),
      )
    })

    test('an unknown path falls through to NotFound', () => {
      story(
        update,
        given(browseModel),
        message(
          ChangedUrl({ url: urlOrThrow('http://localhost/somewhere/else') }),
        ),
        model(model => {
          expect(model.route._tag).toBe('NotFound')
        }),
      )
    })
  })

  describe('ChangedSearchInput', () => {
    test('typing search text fires a URL replacement with the new value', () => {
      story(
        update,
        given(browseModel),
        message(ChangedSearchInput({ value: 'rex' })),
        Command.expectHas(ReplaceFilters),
        Command.resolve(ReplaceFilters, CompletedReplaceFilters()),
      )
    })

    test('clearing the search input fires a replacement', () => {
      story(
        update,
        given({
          ...browseModel,
          route: BrowseRoute({
            search: Option.some('foo'),
            sorting: Unsorted(),
            diet: Option.none(),
            period: Option.none(),
          }),
        }),
        message(ChangedSearchInput({ value: '' })),
        Command.expectHas(ReplaceFilters),
        Command.resolve(ReplaceFilters, CompletedReplaceFilters()),
      )
    })
  })

  describe('ClickedColumnHeader', () => {
    test('first click on an Unsorted column produces an Ascending sort', () => {
      story(
        update,
        given(browseModel),
        message(ClickedColumnHeader({ column: 'Name' })),
        Command.expectHas(ReplaceFilters),
        Command.resolve(ReplaceFilters, CompletedReplaceFilters()),
      )
    })
  })

  describe('Listbox SelectedItem', () => {
    test('selecting a diet refocuses the listbox button and replaces the URL', () => {
      story(
        update,
        given(browseModel),
        message(
          GotDietListboxMessage({
            message: Listbox.Opened({ maybeActiveItemIndex: Option.none() }),
          }),
        ),
        Command.resolve(Listbox.FocusItems, Listbox.CompletedFocusItems()),
        message(
          GotDietListboxMessage({
            message: Listbox.SelectedItem({ item: 'Carnivore' }),
          }),
        ),
        Command.resolve(Listbox.FocusButton, Listbox.CompletedFocusButton()),
        Command.expectHas(ReplaceFilters),
        Command.resolve(ReplaceFilters, CompletedReplaceFilters()),
      )
    })
  })
})
