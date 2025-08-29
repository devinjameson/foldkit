import { Data, Number, Option, Predicate, String, flow } from 'effect'

export type Field<T> = Data.TaggedEnum<{
  NotValidated: { value: T }
  Validating: { value: T }
  Valid: { value: T }
  Invalid: { value: T; error: string }
}>

interface FieldDefinition extends Data.TaggedEnum.WithGenerics<1> {
  readonly taggedEnum: Field<this['A']>
}

export const Field = Data.taggedEnum<FieldDefinition>()

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
        return Field.Invalid({
          value,
          error: message,
        })
      }
    }

    return Field.Valid({ value })
  }
