import { Boolean, Effect, Match as M, Option, Schema as S } from 'effect'

import type { Html, HtmlBuilder } from '../../html/index.js'
import * as ManagedResource from '../../managedResource/index.js'
import { m } from '../../message/index.js'
import { evo } from '../../struct/index.js'

// MODEL

export const Model = S.Struct({
  isFeedOpen: S.Boolean,
  status: S.Literals(['Disconnected', 'Connected', 'Failed']),
})
export type Model = typeof Model.Type

// MESSAGE

export const ClickedToggleFeed = m('ClickedToggleFeed')
export const AcquiredFeedSocket = m('AcquiredFeedSocket', {
  socketId: S.String,
})
export const ReleasedFeedSocket = m('ReleasedFeedSocket')
export const FailedAcquireFeedSocket = m('FailedAcquireFeedSocket', {
  error: S.String,
})

export const Message = S.Union([
  ClickedToggleFeed,
  AcquiredFeedSocket,
  ReleasedFeedSocket,
  FailedAcquireFeedSocket,
])
export type Message = typeof Message.Type

// MANAGED RESOURCE

export type FeedSocket = Readonly<{ socketId: string }>

const FeedSocketResource = ManagedResource.tag<FeedSocket>()('FeedSocket')

const PresenceResource = ManagedResource.tag<string>()('Presence')

export const feedResources = ManagedResource.make<Model, Message>()(entry => ({
  feedSocket: entry(S.Option(S.Struct({ channel: S.String })), {
    resource: FeedSocketResource,
    modelToMaybeRequirements: model =>
      model.isFeedOpen ? Option.some({ channel: 'general' }) : Option.none(),
    acquire: () => Effect.succeed({ socketId: 'live' }),
    release: () => Effect.void,
    onAcquired: socket => AcquiredFeedSocket({ socketId: socket.socketId }),
    onReleased: () => ReleasedFeedSocket(),
    onAcquireError: error => FailedAcquireFeedSocket({ error: String(error) }),
  }),
  presence: entry(S.Option(S.Null), {
    resource: PresenceResource,
    modelToMaybeRequirements: model =>
      model.isFeedOpen ? Option.some(null) : Option.none(),
    acquire: () => Effect.succeed('online'),
    release: () => Effect.void,
    onAcquired: () => AcquiredFeedSocket({ socketId: 'presence' }),
    onReleased: () => ReleasedFeedSocket(),
    onAcquireError: error => FailedAcquireFeedSocket({ error: String(error) }),
  }),
}))

// INIT

export const initialModel = Model.make({
  isFeedOpen: false,
  status: 'Disconnected',
})

// UPDATE

export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<never>] =>
  M.value(message).pipe(
    M.withReturnType<readonly [Model, ReadonlyArray<never>]>(),
    M.tagsExhaustive({
      ClickedToggleFeed: () => [evo(model, { isFeedOpen: Boolean.not }), []],
      AcquiredFeedSocket: () => [evo(model, { status: () => 'Connected' }), []],
      ReleasedFeedSocket: () => [
        evo(model, { status: () => 'Disconnected' }),
        [],
      ],
      FailedAcquireFeedSocket: () => [
        evo(model, { status: () => 'Failed' }),
        [],
      ],
    }),
  )

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      h.span([h.Role('status')], [model.status]),
      h.button(
        [h.OnClick(ClickedToggleFeed()), h.Role('button')],
        [model.isFeedOpen ? 'Close feed' : 'Open feed'],
      ),
    ],
  )
