import { Option } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { fromString } from 'foldkit/url'
import { describe, expect, test } from 'vitest'

import { Counter } from './island'
import { ChangedUrl, GotCounterMessage, HomeRoute, Model, update } from './main'

const home = Model.make({ route: HomeRoute(), counter: Counter.init })

const urlOrThrow = (raw: string) =>
  Option.getOrThrowWith(
    fromString(raw),
    () => new Error(`Failed to parse url: ${raw}`),
  )

describe('update', () => {
  describe('ChangedUrl', () => {
    test('navigating to / parses to the Home route', () => {
      story(
        update,
        given(home),
        message(ChangedUrl({ url: urlOrThrow('http://localhost/') })),
        model(model => {
          expect(model.route._tag).toBe('Home')
        }),
      )
    })

    test('navigating to /posts parses to the Posts route', () => {
      story(
        update,
        given(home),
        message(ChangedUrl({ url: urlOrThrow('http://localhost/posts') })),
        model(model => {
          expect(model.route._tag).toBe('Posts')
        }),
      )
    })

    test('navigating to /posts/making-this-blog captures the slug', () => {
      story(
        update,
        given(home),
        message(
          ChangedUrl({
            url: urlOrThrow('http://localhost/posts/making-this-blog'),
          }),
        ),
        model(model => {
          if (model.route._tag === 'Post') {
            expect(model.route.slug).toBe('making-this-blog')
          } else {
            throw new Error('Expected Post route')
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
  })

  describe('GotCounterMessage', () => {
    test('increments route through the Counter submodel without commands', () => {
      story(
        update,
        given(home),
        message(GotCounterMessage({ message: Counter.ClickedIncrement() })),
        message(GotCounterMessage({ message: Counter.ClickedIncrement() })),
        Command.expectNone(),
        model(model => {
          expect(model.counter.count).toBe(2)
        }),
      )
    })

    test('the count survives navigating between routes', () => {
      story(
        update,
        given(home),
        message(GotCounterMessage({ message: Counter.ClickedIncrement() })),
        message(ChangedUrl({ url: urlOrThrow('http://localhost/posts') })),
        message(
          ChangedUrl({
            url: urlOrThrow('http://localhost/posts/making-this-blog'),
          }),
        ),
        model(model => {
          expect(model.counter.count).toBe(1)
        }),
      )
    })
  })
})
