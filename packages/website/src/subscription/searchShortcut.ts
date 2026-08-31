import { Effect, Option, Schema, Stream } from 'effect'
import { Subscription } from 'foldkit'

import { Message } from '../message'
import type { Model } from '../model'
import { isSearchRoute } from '../route'

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  searchShortcut: entry(
    { isDocsPage: Schema.Boolean },
    {
      modelToDependencies: model => ({
        isDocsPage: isSearchRoute(model.route),
      }),
      dependenciesToStream: ({ isDocsPage }) =>
        Stream.when(
          Subscription.fromEventFilterMap<
            KeyboardEvent,
            typeof Message.PressedSearchShortcut.Type
          >({
            target: document,
            type: 'keydown',
            toMessage: event => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
                event.preventDefault()
                return Option.some(Message.PressedSearchShortcut())
              }
              return Option.none()
            },
          }),
          Effect.sync(() => isDocsPage),
        ),
    },
  ),
}))
