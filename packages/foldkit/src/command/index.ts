import { Effect, Schema } from 'effect'

/** An `Effect` that produces a message, used for side effects in the update function. */
export type Command<T, E = never, R = never> = Effect.Effect<
  T extends Schema.Schema.Any ? Schema.Schema.Type<T> : T,
  E,
  R
>
