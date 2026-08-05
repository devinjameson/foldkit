import { Array, Effect, Option, Random, Schedule } from 'effect'

import { Position, equivalence } from './position'

// An Effect that produces a domain value is still a domain concern. It names
// no Message and no runtime, so it stays here.
export const generatePosition = (taken: ReadonlyArray<Position>) =>
  Effect.gen(function* () {
    const x = yield* Random.nextIntBetween(0, 20, { halfOpen: true })
    const y = yield* Random.nextIntBetween(0, 20, { halfOpen: true })
    const position: Position = { x, y }
    return Option.isSome(
      Array.findFirst(taken, other => equivalence(other, position)),
    )
      ? yield* Effect.fail('PositionCollision' as const)
      : position
  }).pipe(Effect.retry(Schedule.forever), Effect.orDie)
