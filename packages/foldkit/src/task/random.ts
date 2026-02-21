import { Effect } from 'effect'

/**
 * Creates a command that generates a random integer between min (inclusive) and max (exclusive)
 * and passes it to a message constructor.
 *
 * @example
 * ```typescript
 * Task.randomInt(0, 100, value => GotRandom({ value }))
 * ```
 */
export const randomInt = <Message>(
  min: number,
  max: number,
  f: (value: number) => Message,
): Effect.Effect<Message> =>
  Effect.sync(() => f(Math.floor(Math.random() * (max - min)) + min))
