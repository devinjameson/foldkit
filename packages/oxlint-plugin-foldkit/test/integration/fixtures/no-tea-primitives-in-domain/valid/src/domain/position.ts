import { Match, Schema } from 'effect'

// A schema and pure functions over it. Schema is what a domain module is for,
// and Match, Array, and the rest of the effect toolkit are ordinary values.
export const Position = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
})

export type Position = typeof Position.Type

export const equivalence = Schema.toEquivalence(Position)

export const Direction = Schema.Literals(['Up', 'Down', 'Left', 'Right'])
export type Direction = typeof Direction.Type

export const move = (position: Position, direction: Direction): Position =>
  Match.value(direction).pipe(
    Match.withReturnType<Position>(),
    Match.when('Up', () => ({ x: position.x, y: position.y - 1 })),
    Match.when('Down', () => ({ x: position.x, y: position.y + 1 })),
    Match.when('Left', () => ({ x: position.x - 1, y: position.y })),
    Match.when('Right', () => ({ x: position.x + 1, y: position.y })),
    Match.exhaustive,
  )
