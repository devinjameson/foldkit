import { Number, Option, Predicate, Schema as S, String, flow } from 'effect'

export const FieldSchema = <A, I = A, R = never>(valueSchema: S.Schema<A, I, R>) => {
  return S.Union(
    S.TaggedStruct('NotValidated', { value: valueSchema }),
    S.TaggedStruct('Validating', { value: valueSchema }),
    S.TaggedStruct('Valid', { value: valueSchema }),
    S.TaggedStruct('Invalid', { value: valueSchema, error: S.String }),
  )
}

export const Field = {
  NotValidated: <T>(args: { value: T }): Field<T> => ({ _tag: 'NotValidated' as const, ...args }),
  Validating: <T>(args: { value: T }): Field<T> => ({ _tag: 'Validating' as const, ...args }),
  Valid: <T>(args: { value: T }): Field<T> => ({ _tag: 'Valid' as const, ...args }),
  Invalid: <T>(args: { value: T; error: string }): Field<T> => ({
    _tag: 'Invalid' as const,
    ...args,
  }),
  $is:
    (tag: 'NotValidated' | 'Validating' | 'Valid' | 'Invalid') =>
    <T>(field: Field<T>): boolean =>
      field._tag === tag,
  $match: <T, R>(
    field: Field<T>,
    matchers: {
      NotValidated: (args: { value: T }) => R
      Validating: (args: { value: T }) => R
      Valid: (args: { value: T }) => R
      Invalid: (args: { value: T; error: string }) => R
    },
  ): R => {
    // TODO: Use Match here (ran into Unify<R> vs. R issues)
    switch (field._tag) {
      case 'NotValidated':
        return matchers.NotValidated({ value: field.value })
      case 'Validating':
        return matchers.Validating({ value: field.value })
      case 'Valid':
        return matchers.Valid({ value: field.value })
      case 'Invalid':
        return matchers.Invalid({ value: field.value, error: field.error })
    }
  },
}

export type Field<T> =
  | { readonly _tag: 'NotValidated'; readonly value: T }
  | { readonly _tag: 'Validating'; readonly value: T }
  | { readonly _tag: 'Valid'; readonly value: T }
  | { readonly _tag: 'Invalid'; readonly value: T; readonly error: string }

export type FieldValidation<T> = [Predicate.Predicate<T>, string]

export const required = (fieldName: string): FieldValidation<string> => [
  String.isNonEmpty,
  `${fieldName} is required`,
]

export const minLength = (
  min: number,
  message: (min: number) => string,
): FieldValidation<string> => [flow(String.length, Number.greaterThanOrEqualTo(min)), message(min)]

export const regex = (regex: RegExp, message: string): FieldValidation<string> => [
  flow(String.match(regex), Option.isSome),
  message,
]

export const validateField =
  <T>(fieldValidations: FieldValidation<T>[]) =>
  (value: T): Field<T> => {
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
