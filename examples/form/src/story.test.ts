import { FieldValidation } from 'foldkit'
import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import {
  ClickedFormSubmit,
  CompletedValidateEmail,
  FailedSubmitForm,
  type Model,
  SubmitForm,
  SucceededSubmitForm,
  UpdatedEmail,
  UpdatedMessageText,
  UpdatedName,
  ValidateEmail,
  initialModel,
  update,
} from './main'

const validModel: Model = {
  ...initialModel,
  name: FieldValidation.Valid({ value: 'Alice' }),
  email: FieldValidation.Valid({ value: 'alice@example.com' }),
}

describe('update', () => {
  describe('name field', () => {
    test('typing a long name produces a Valid field', () => {
      story(
        update,
        given(initialModel),
        message(UpdatedName({ value: 'Alice' })),
        model(model => {
          expect(model.name._tag).toBe('Valid')
          expect(model.name.value).toBe('Alice')
        }),
      )
    })

    test('typing a short name produces an Invalid field with the min-length error', () => {
      story(
        update,
        given(initialModel),
        message(UpdatedName({ value: 'A' })),
        model(model => {
          expect(model.name._tag).toBe('Invalid')
          if (model.name._tag === 'Invalid') {
            expect(model.name.errors).toContain(
              'Name must be at least 2 characters',
            )
          }
        }),
      )
    })
  })

  describe('email field', () => {
    test('typing a well-formed email transitions to Validating and fires ValidateEmail', () => {
      story(
        update,
        given(initialModel),
        message(UpdatedEmail({ value: 'alice@example.com' })),
        model(model => {
          expect(model.email._tag).toBe('Validating')
        }),
        Command.expectHas(ValidateEmail),
        Command.resolve(
          ValidateEmail,
          CompletedValidateEmail({
            field: FieldValidation.Valid({ value: 'alice@example.com' }),
          }),
        ),
        model(model => {
          expect(model.email._tag).toBe('Valid')
        }),
      )
    })

    test('typing a malformed email produces Invalid without an async command', () => {
      story(
        update,
        given(initialModel),
        message(UpdatedEmail({ value: 'not-an-email' })),
        Command.expectNone(),
        model(model => {
          expect(model.email._tag).toBe('Invalid')
        }),
      )
    })

    test('a validation result for a superseded email value is ignored', () => {
      const inFlightModel: Model = {
        ...initialModel,
        email: FieldValidation.Validating({ value: 'alice@example.com' }),
      }

      story(
        update,
        given(inFlightModel),
        message(
          CompletedValidateEmail({
            field: FieldValidation.Valid({ value: 'old@example.com' }),
          }),
        ),
        model(model => {
          expect(model.email._tag).toBe('Validating')
        }),
      )
    })

    test('a validation result for the current email value updates the field', () => {
      const inFlightModel: Model = {
        ...initialModel,
        email: FieldValidation.Validating({ value: 'taken@example.com' }),
      }

      story(
        update,
        given(inFlightModel),
        message(
          CompletedValidateEmail({
            field: FieldValidation.Invalid({
              value: 'taken@example.com',
              errors: ['This email is already on our waitlist'],
            }),
          }),
        ),
        model(model => {
          expect(model.email._tag).toBe('Invalid')
        }),
      )
    })
  })

  describe('message text field', () => {
    test('UpdatedMessageText stores the value as Valid', () => {
      story(
        update,
        given(initialModel),
        message(UpdatedMessageText({ value: 'Hello there.' })),
        model(model => {
          expect(model.messageText._tag).toBe('Valid')
          expect(model.messageText.value).toBe('Hello there.')
        }),
      )
    })
  })

  describe('submission', () => {
    test('ClickedFormSubmit on an invalid form is ignored', () => {
      story(
        update,
        given(initialModel),
        message(ClickedFormSubmit()),
        Command.expectNone(),
        model(model => {
          expect(model.submission._tag).toBe('NotSubmitted')
        }),
      )
    })

    test('ClickedFormSubmit on a valid form fires SubmitForm and enters Submitting', () => {
      story(
        update,
        given(validModel),
        message(ClickedFormSubmit()),
        model(model => {
          expect(model.submission._tag).toBe('Submitting')
        }),
        Command.expectHas(SubmitForm),
        Command.resolve(SubmitForm, SucceededSubmitForm({ name: 'Alice' })),
        model(model => {
          expect(model.submission._tag).toBe('SubmitSuccess')
          if (model.submission._tag === 'SubmitSuccess') {
            expect(model.submission.confirmationText).toContain('Alice')
          }
        }),
      )
    })

    test('FailedSubmitForm sets SubmitError', () => {
      story(
        update,
        given(validModel),
        message(ClickedFormSubmit()),
        Command.resolve(SubmitForm, FailedSubmitForm()),
        model(model => {
          expect(model.submission._tag).toBe('SubmitError')
        }),
      )
    })
  })
})
