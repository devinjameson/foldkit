import { Number, Option, Predicate, Schema as S, String, flow } from 'effect'

export const makeField = <A, I>(value: S.Schema<A, I>) => {
  const NotValidated = S.TaggedStruct('NotValidated', { value })
  const Validating = S.TaggedStruct('Validating', { value })
  const Valid = S.TaggedStruct('Valid', { value })
  const Invalid = S.TaggedStruct('Invalid', { value, error: S.String })

  return {
    NotValidated,
    Validating,
    Valid,
    Invalid,
    Union: S.Union(NotValidated, Validating, Valid, Invalid),
  }
}

export type Validation<T> = [Predicate.Predicate<T>, string]

export const required = (fieldName: string): Validation<string> => [
  String.isNonEmpty,
  `${fieldName} is required`,
]

export const minLength = (min: number, message: (min: number) => string): Validation<string> => [
  flow(String.length, Number.greaterThanOrEqualTo(min)),
  message(min),
]

export const regex = (regex: RegExp, message: string): Validation<string> => [
  flow(String.match(regex), Option.isSome),
  message,
]

export const validateField =
  <T>(fieldValidations: ReadonlyArray<Validation<T>>) =>
  (value: T) => {
    for (const [predicate, message] of fieldValidations) {
      if (!predicate(value)) {
        return {
          _tag: 'Invalid' as const,
          value,
          error: message,
        }
      }
    }

    return {
      _tag: 'Valid' as const,
      value,
    }
  }
