import { Array, Option, String } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { fromString } from 'foldkit/url'
import { describe, expect, test } from 'vitest'

import {
  ChangedUrl,
  GotPeopleMessage,
  HomeRoute,
  Model,
  PeopleRoute,
  update,
} from './main'
import { People } from './page'

const peoplePageWith = (searchInput: string) =>
  People.Model.make({
    searchInput,
    searchHistory: Array.liftPredicate(String.isNonEmpty)(searchInput),
    results: People.SearchLoaded({
      query: searchInput,
      people: People.searchPeople(searchInput),
    }),
  })

const initialPeoplePage = peoplePageWith('')

const home = Model.make({ route: HomeRoute(), peoplePage: initialPeoplePage })

const onPeople = (searchInput: string) =>
  Model.make({
    route: PeopleRoute({
      searchText: Option.liftPredicate(String.isNonEmpty)(searchInput),
    }),
    peoplePage: peoplePageWith(searchInput),
  })

const urlOrThrow = (raw: string) =>
  Option.getOrThrowWith(
    fromString(raw),
    () => new Error(`Failed to parse url: ${raw}`),
  )

const resolveFetch = (searchText: string) =>
  Command.resolve(
    People.FetchPeople,
    People.SucceededFetchPeople({
      query: searchText,
      people: People.searchPeople(searchText),
    }),
  )

describe('update', () => {
  describe('ChangedUrl', () => {
    test('navigating to /people parses to a People route', () => {
      story(
        update,
        given(home),
        message(ChangedUrl({ url: urlOrThrow('http://localhost/people') })),
        model(model => {
          if (model.route._tag === 'People') {
            expect(model.route.searchText).toStrictEqual(Option.none())
          } else {
            throw new Error('Expected People route')
          }
        }),
        resolveFetch(''),
      )
    })

    test('navigating to /people?searchText=foo captures the query parameter', () => {
      story(
        update,
        given(home),
        message(
          ChangedUrl({
            url: urlOrThrow('http://localhost/people?searchText=foo'),
          }),
        ),
        model(model => {
          if (model.route._tag === 'People') {
            expect(model.route.searchText).toStrictEqual(Option.some('foo'))
          } else {
            throw new Error('Expected People route')
          }
        }),
        resolveFetch('foo'),
      )
    })

    test('navigating to /people/3 parses to a Person route with numeric id', () => {
      story(
        update,
        given(home),
        message(ChangedUrl({ url: urlOrThrow('http://localhost/people/3') })),
        model(model => {
          if (model.route._tag === 'Person') {
            expect(model.route.personId).toBe(3)
          } else {
            throw new Error('Expected Person route')
          }
        }),
      )
    })

    test('an unknown path falls through to NotFound with the path captured', () => {
      story(
        update,
        given(home),
        message(ChangedUrl({ url: urlOrThrow('http://localhost/missing') })),
        model(model => {
          if (model.route._tag === 'NotFound') {
            expect(model.route.path).toBe('/missing')
          } else {
            throw new Error('Expected NotFound route')
          }
        }),
      )
    })

    test('the deep nested path resolves to Nested', () => {
      story(
        update,
        given(home),
        message(
          ChangedUrl({
            url: urlOrThrow('http://localhost/nested/route/is/very/nested'),
          }),
        ),
        model(model => {
          expect(model.route._tag).toBe('Nested')
        }),
      )
    })

    test('navigating to /files parses to the FilesIndex route', () => {
      story(
        update,
        given(home),
        message(ChangedUrl({ url: urlOrThrow('http://localhost/files') })),
        model(model => {
          expect(model.route._tag).toBe('FilesIndex')
        }),
      )
    })

    test('navigating under /files captures the remaining segments', () => {
      story(
        update,
        given(home),
        message(
          ChangedUrl({
            url: urlOrThrow('http://localhost/files/documents/taxes'),
          }),
        ),
        model(model => {
          if (model.route._tag === 'Files') {
            expect(model.route.path).toStrictEqual(['documents', 'taxes'])
          } else {
            throw new Error('Expected Files route')
          }
        }),
      )
    })

    test('a same-page URL change syncs the input, records history, and refetches', () => {
      story(
        update,
        given(onPeople('')),
        message(
          ChangedUrl({
            url: urlOrThrow('http://localhost/people?searchText=designer'),
          }),
        ),
        model(model => {
          expect(model.peoplePage.searchInput).toBe('designer')
          expect(model.peoplePage.searchHistory).toStrictEqual(['designer'])
          expect(model.peoplePage.results._tag).toBe('SearchLoading')
        }),
        Command.expectHas(People.FetchPeople),
        resolveFetch('designer'),
        model(model => {
          if (model.peoplePage.results._tag === 'SearchLoaded') {
            expect(
              model.peoplePage.results.people.map(person => person.name),
            ).toStrictEqual(['Alice Johnson', 'Eva Brown'])
          } else {
            throw new Error('Expected SearchLoaded')
          }
        }),
      )
    })
  })

  describe('GotPeopleMessage', () => {
    test('typing updates the input without recording history or firing a command', () => {
      story(
        update,
        given(onPeople('')),
        message(
          GotPeopleMessage({
            message: People.ChangedSearchInput({ value: 'd' }),
          }),
        ),
        message(
          GotPeopleMessage({
            message: People.ChangedSearchInput({ value: 'de' }),
          }),
        ),
        message(
          GotPeopleMessage({
            message: People.ChangedSearchInput({ value: 'designer' }),
          }),
        ),
        Command.expectNone(),
        model(model => {
          expect(model.peoplePage.searchInput).toBe('designer')
          expect(model.peoplePage.searchHistory).toStrictEqual([])
        }),
      )
    })

    test('submitting the search pushes the current input to the URL', () => {
      story(
        update,
        given(onPeople('designer')),
        message(GotPeopleMessage({ message: People.SubmittedSearch() })),
        Command.expectHas(People.PushSearchUrl),
        Command.resolve(People.PushSearchUrl, People.CompletedPushSearchUrl()),
      )
    })
  })
})
