import { Effect, Stream } from 'effect'
import { Subscription } from 'foldkit'

import { ClickedReload } from './message'

export const subscriptions = Subscription.persistent(
  Stream.repeatEffect(Effect.succeed(ClickedReload())),
)
