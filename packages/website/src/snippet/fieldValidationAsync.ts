import { Effect, Match as M, Number, Schema as S } from 'effect'
import { Command } from 'foldkit'
import { Invalid, Valid, Validating, validate } from 'foldkit/fieldValidation'
import { evo } from 'foldkit/struct'

const validateEmail = validate(emailRules)

const CheckEmailAvailable = Command.define('CheckEmailAvailable', {
  args: { email: S.String, validationId: S.Number },
  messages: [CompletedCheckEmailAvailable],
  execute: ({ email, validationId }) =>
    Effect.gen(function* () {
      const isAvailable = yield* apiCheckEmail(email)
      return CompletedCheckEmailAvailable({
        validationId,
        field: isAvailable
          ? Valid({ value: email })
          : Invalid({
              value: email,
              errors: ['This email is already taken'],
            }),
      })
    }).pipe(
      Effect.catch(() =>
        Effect.succeed(
          CompletedCheckEmailAvailable({
            validationId,
            field: Invalid({
              value: email,
              errors: ['Could not check this email. Try again.'],
            }),
          }),
        ),
      ),
    ),
})

const update = (model: Model, message: Message) =>
  M.value(message).pipe(
    M.tagsExhaustive({
      ChangedEmail: ({ value }) => {
        const syncResult = validateEmail(value)
        const validationId = Number.increment(model.emailValidationId)

        return M.value(syncResult).pipe(
          M.tag('Valid', () => [
            evo(model, {
              email: () => Validating({ value }),
              emailValidationId: () => validationId,
            }),
            [CheckEmailAvailable({ email: value, validationId })],
          ]),
          M.orElse(() => [
            evo(model, {
              email: () => syncResult,
              emailValidationId: () => validationId,
            }),
            [],
          ]),
        )
      },

      CompletedCheckEmailAvailable: ({ validationId, field }) => {
        if (validationId === model.emailValidationId) {
          return [evo(model, { email: () => field }), []]
        } else {
          return [model, []]
        }
      },
    }),
  )
