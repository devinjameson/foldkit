import { Array, Effect, Equal, Option, Predicate, String as Str, pipe } from 'effect'
import { FieldValidation } from 'foldkit'
import { Field, Validation } from 'foldkit/fieldValidation'

import { MAX_WRONG_CHARS } from './constant'

export const usernameValidations: ReadonlyArray<Validation<string>> = [
  FieldValidation.required('Username'),
  FieldValidation.minLength(2, (min) => `Username must be at least ${min} characters`),
]

export const roomIdValidations: ReadonlyArray<Validation<string>> = [
  FieldValidation.required('Room ID'),
]

export const isEveryFieldValid = (fields: ReadonlyArray<Field<unknown>>): boolean =>
  Array.every(fields, Field.$is('Valid'))

export const isAnyFieldNotValid = (fields: ReadonlyArray<Field<unknown>>): boolean =>
  Array.some(fields, (field) => !Field.$is('Valid')(field))

const toNonEmptyStringOption = Option.liftPredicate(Str.isNonEmpty)

export const validateUserTextInput = (
  newUserText: string,
  maybeGameText: Option.Option<string>,
): string =>
  Effect.gen(function* () {
    yield* toNonEmptyStringOption(newUserText)
    const gameText = yield* maybeGameText
    const firstWrongIndex = yield* findFirstWrongCharIndex(newUserText)(gameText)

    const wrongCharCount = Str.length(newUserText) - firstWrongIndex
    const exceedsMaxWrongChars = wrongCharCount > MAX_WRONG_CHARS

    return exceedsMaxWrongChars
      ? Str.slice(0, firstWrongIndex + MAX_WRONG_CHARS)(newUserText)
      : newUserText
  }).pipe(
    Effect.catchAll(() => Effect.succeed(newUserText)),
    Effect.runSync,
  )

export const findFirstWrongCharIndex =
  (userText: string) =>
  (gameText: string): Option.Option<number> =>
    pipe(
      userText,
      Str.split(''),
      Array.findFirstIndex((char, index) =>
        pipe(gameText, Str.at(index), Option.exists(Predicate.not(Equal.equals(char)))),
      ),
    )
