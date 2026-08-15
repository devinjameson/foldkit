import { Effect, Stream } from 'effect'

import { PressedKey } from './message'

export const keyboard = Stream.fromEventListener<KeyboardEvent>(
  document,
  'keydown',
).pipe(
  Stream.mapEffect(keyboardEvent =>
    Effect.sync(() => keyboardEvent.preventDefault()).pipe(
      Effect.as(PressedKey({ key: keyboardEvent.key })),
    ),
  ),
)
