import * as Shared from '@typing-game/shared'
import { Context, HashMap, Layer, SubscriptionRef } from 'effect'

export class RoomByIdStore extends Context.Tag('RoomByIdStore')<
  RoomByIdStore,
  SubscriptionRef.SubscriptionRef<HashMap.HashMap<string, Shared.Room>>
>() {}

type ProgressByGamePlayer = HashMap.HashMap<Shared.GamePlayer, Shared.PlayerProgress>

export class ProgressByGamePlayerStore extends Context.Tag('ProgressByGamePlayerStore')<
  ProgressByGamePlayerStore,
  SubscriptionRef.SubscriptionRef<ProgressByGamePlayer>
>() {}

export const RoomByIdStoreLive = Layer.effect(
  RoomByIdStore,
  SubscriptionRef.make(HashMap.empty<string, Shared.Room>()),
)

export const ProgressByGamePlayerStoreLive = Layer.effect(
  ProgressByGamePlayerStore,
  SubscriptionRef.make(HashMap.empty<Shared.GamePlayer, Shared.PlayerProgress>()),
)
