import { Option, String } from 'effect'

export const fromString = Option.liftPredicate(String.isNonEmpty)
