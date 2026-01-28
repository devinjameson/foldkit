import { Array, Number, Option, Predicate, Schema as S, String, flow } from 'effect'

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

// STRING VALIDATORS

export const required = (message = 'Required'): Validation<string> => [String.isNonEmpty, message]

export const minLength = (min: number, message?: string): Validation<string> => [
  flow(String.length, Number.greaterThanOrEqualTo(min)),
  message ?? `Must be at least ${min} characters`,
]

export const maxLength = (max: number, message?: string): Validation<string> => [
  flow(String.length, Number.lessThanOrEqualTo(max)),
  message ?? `Must be at most ${max} characters`,
]

export const pattern = (regex: RegExp, message = 'Invalid format'): Validation<string> => [
  flow(String.match(regex), Option.isSome),
  message,
]

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const email = (message = 'Invalid email address'): Validation<string> =>
  pattern(EMAIL_REGEX, message)

const URL_REGEX = /^https?:\/\/.+/

export const url = (message = 'Invalid URL'): Validation<string> => pattern(URL_REGEX, message)

export const startsWith = (prefix: string, message?: string): Validation<string> => [
  flow(String.startsWith(prefix)),
  message ?? `Must start with ${prefix}`,
]

export const endsWith = (suffix: string, message?: string): Validation<string> => [
  flow(String.endsWith(suffix)),
  message ?? `Must end with ${suffix}`,
]

export const includes = (substring: string, message?: string): Validation<string> => [
  flow(String.includes(substring)),
  message ?? `Must contain ${substring}`,
]

export const equals = (expected: string, message?: string): Validation<string> => [
  (value) => value === expected,
  message ?? `Must match ${expected}`,
]

// NUMBER VALIDATORS

export const min = (num: number, message?: string): Validation<number> => [
  Number.greaterThanOrEqualTo(num),
  message ?? `Must be at least ${num}`,
]

export const max = (num: number, message?: string): Validation<number> => [
  Number.lessThanOrEqualTo(num),
  message ?? `Must be at most ${num}`,
]

export const between = (min: number, max: number, message?: string): Validation<number> => [
  (value) => value >= min && value <= max,
  message ?? `Must be between ${min} and ${max}`,
]

export const positive = (message = 'Must be positive'): Validation<number> => [
  Number.greaterThan(0),
  message,
]

export const nonNegative = (message = 'Must be non-negative'): Validation<number> => [
  Number.greaterThanOrEqualTo(0),
  message,
]

export const integer = (message = 'Must be a whole number'): Validation<number> => [
  (value) => globalThis.Number.isInteger(value),
  message,
]

// GENERIC VALIDATORS

export const oneOf = (values: ReadonlyArray<string>, message?: string): Validation<string> => {
  const joinedValues = Array.join(values, ', ')
  const message_ = message ?? `Must be one of: ${joinedValues}`
  return [(value) => Array.contains(values, value), message_]
}

// VALIDATE

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
