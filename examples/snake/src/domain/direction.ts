import { Match } from 'effect'

export type Direction = 'Up' | 'Down' | 'Left' | 'Right'

export const opposite = (direction: Direction): Direction =>
  Match.value(direction).pipe(
    Match.withReturnType<Direction>(),
    Match.when('Up', () => 'Down'),
    Match.when('Down', () => 'Up'),
    Match.when('Left', () => 'Right'),
    Match.when('Right', () => 'Left'),
    Match.exhaustive,
  )

export const isOpposite = (a: Direction, b: Direction): boolean => opposite(a) === b
