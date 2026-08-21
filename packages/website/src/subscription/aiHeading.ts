import { Duration, Effect, Schema as S, Stream } from 'effect'
import { Subscription } from 'foldkit'

import { type Model } from '../main'
import { Message } from '../message'

const TOGGLE_INTERVAL_MS = 3000

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  aiHeading: entry(
    { isLandingPage: S.Boolean },
    {
      modelToDependencies: model => ({
        isLandingPage: model.route._tag === 'Home',
      }),
      dependenciesToStream: ({ isLandingPage }) =>
        Stream.when(
          Stream.tick(Duration.millis(TOGGLE_INTERVAL_MS)).pipe(
            Stream.map(Message.ToggledAiHeading),
          ),
          Effect.sync(() => isLandingPage),
        ),
    },
  ),
}))
