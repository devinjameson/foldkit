import { Array, Data, Duration, Effect, Number, Option } from 'effect'
import {
  fold,
  makeElement,
  updateConstructors,
  Command,
  empty,
  ElementInit,
  Field,
  FieldValidation,
  required,
  minLength,
  regex,
  validateField,
} from '@foldkit'
import {
  Class,
  Html,
  OnChange,
  OnSubmit,
  Id,
  For,
  Type,
  Value,
  Disabled,
  button,
  div,
  input,
  textarea,
  h1,
  form,
  label,
  span,
} from '@foldkit/html'

// MODEL

type Submission = Data.TaggedEnum<{
  NotSubmitted: {}
  Submitting: {}
  SubmitSuccess: { message: string }
  SubmitError: { error: string }
}>

const Submission = Data.taggedEnum<Submission>()

type Model = Readonly<{
  name: Field<string>
  email: Field<string>
  emailValidationId: number
  message: Field<string>
  submission: Submission
}>

// MESSAGE

type Message = Data.TaggedEnum<{
  NoOp: {}
  UpdateName: { value: string }
  UpdateEmail: { value: string }
  EmailValidated: { validationId: number; field: Field<string> }
  UpdateMessage: { value: string }

  SubmitForm: {}
  FormSubmitted: { message: string }
  FormSubmitError: { error: string }
}>
const Message = Data.taggedEnum<Message>()

const { identity, pure, pureCommand } = updateConstructors<Model, Message>()

const noOp = Effect.succeed(Message.NoOp())

// INIT

const init: ElementInit<Model, Message> = () => [
  {
    name: Field.NotValidated({ value: '' }),
    email: Field.NotValidated({ value: '' }),
    emailValidationId: 0,
    message: Field.NotValidated({ value: '' }),
    submission: Submission.NotSubmitted(),
  },
  Option.none(),
]

// FIELD VALIDATION

const nameValidations: FieldValidation<string>[] = [
  minLength(2, (min) => `Name must be at least ${min} characters`),
]

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const emailValidations: FieldValidation<string>[] = [
  required('Email'),
  regex(emailRegex, 'Please enter a valid email address'),
]

const EMAILS_ON_WAITLIST = ['test@example.com', 'demo@email.com', 'admin@test.com']

const isEmailOnWaitlist = (email: string): Effect.Effect<boolean> =>
  Effect.gen(function* () {
    yield* Effect.sleep(Duration.millis(FAKE_API_DELAY_MS))
    return Array.contains(EMAILS_ON_WAITLIST, email.toLowerCase())
  })

const validateEmailNotOnWaitlist = (email: string, validationId: number): Command<Message> =>
  Effect.gen(function* () {
    if (yield* isEmailOnWaitlist(email)) {
      return Message.EmailValidated({
        validationId,
        field: Field.Invalid({ value: email, error: 'This email is already on our waitlist' }),
      })
    } else {
      return Message.EmailValidated({
        validationId,
        field: Field.Valid({ value: email }),
      })
    }
  })

const messageValidations: FieldValidation<string>[] = []

const validateName = validateField(nameValidations)
const validateEmail = validateField(emailValidations)
const validateMessage = validateField(messageValidations)

const isFormValid = (model: Model): boolean =>
  Array.every([model.name, model.email], Field.$is('Valid'))

// UPDATE

const update = fold<Model, Message>({
  NoOp: identity,

  UpdateName: pure((model, { value }) => ({
    ...model,
    name: validateName(value),
  })),

  UpdateEmail: pureCommand((model, { value }) => {
    const validateEmailResult = validateEmail(value)
    const validationId = Number.increment(model.emailValidationId)

    if (Field.$is('Valid')(validateEmailResult)) {
      return [
        { ...model, email: Field.Validating({ value }), emailValidationId: validationId },
        validateEmailNotOnWaitlist(value, validationId),
      ]
    } else {
      return [{ ...model, email: validateEmailResult, emailValidationId: validationId }, noOp]
    }
  }),

  EmailValidated: pure((model, { validationId, field }) => {
    if (validationId === model.emailValidationId) {
      return { ...model, email: field }
    } else {
      return model
    }
  }),

  UpdateMessage: pure((model, { value }) => ({
    ...model,
    message: validateMessage(value),
  })),

  SubmitForm: pureCommand((model) => {
    if (!isFormValid(model)) {
      return [model, noOp]
    }

    return [
      {
        ...model,
        submission: Submission.Submitting(),
      },
      submitForm(model),
    ]
  }),

  FormSubmitted: pure((model, { message }) => ({
    ...model,
    submission: Submission.SubmitSuccess({ message }),
  })),

  FormSubmitError: pure((model, { error }) => ({
    ...model,
    submission: Submission.SubmitError({ error }),
  })),
})

// COMMAND

const FAKE_API_DELAY_MS = 500

const submitForm = (model: Model): Command<Message> =>
  Effect.gen(function* () {
    const formData = {
      name: model.name.value,
      email: model.email.value,
      message: model.message.value,
    }

    yield* Effect.sleep('2 seconds')

    const random = yield* Effect.random
    const success = yield* random.nextBoolean

    if (success) {
      return Message.FormSubmitted({
        message: `Welcome to the waitlist, ${formData.name}! We'll be in touch soon.`,
      })
    } else {
      return Message.FormSubmitError({
        error: 'Sorry, there was an error adding you to the waitlist. Please try again.',
      })
    }
  })

// VIEW

const fieldView = (
  id: string,
  labelText: string,
  field: Field<string>,
  onUpdate: (value: string) => Message,
  type: 'text' | 'email' | 'textarea' = 'text',
): Html => {
  const { value } = field

  const getBorderClass = () =>
    Field.$match(field, {
      NotValidated: () => 'border-gray-300',
      Validating: () => 'border-blue-300',
      Valid: () => 'border-green-500',
      Invalid: () => 'border-red-500',
    })

  const inputClass = `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${getBorderClass()}`

  return div(
    [Class('mb-4')],
    [
      div(
        [Class('flex items-center gap-2 mb-2')],
        [
          label([For(id), Class('text-sm font-medium text-gray-700')], [labelText]),
          Field.$match(field, {
            NotValidated: () => empty,
            Validating: () => span([Class('text-blue-600 text-sm animate-spin')], ['◐']),
            Valid: () => span([Class('text-green-600 text-sm')], ['✓']),
            Invalid: () => empty,
          }),
        ],
      ),
      type === 'textarea'
        ? textarea([Id(id), Value(value), Class(inputClass), OnChange(onUpdate)])
        : input([Id(id), Type(type), Value(value), Class(inputClass), OnChange(onUpdate)]),

      Field.$match(field, {
        NotValidated: () => empty,
        Validating: () => div([Class('text-blue-600 text-sm mt-1')], ['Checking...']),
        Valid: () => empty,
        Invalid: ({ error }) => div([Class('text-red-600 text-sm mt-1')], [error]),
      }),
    ],
  )
}

const view = (model: Model): Html => {
  const canSubmit = isFormValid(model) && !Submission.$is('Submitting')(model.submission)

  return div(
    [Class('min-h-screen bg-gray-100 py-8')],
    [
      div(
        [Class('max-w-md mx-auto bg-white rounded-xl shadow-lg p-6')],
        [
          h1([Class('text-3xl font-bold text-gray-800 text-center mb-8')], ['Join Our Waitlist']),

          form(
            [Class('space-y-4'), OnSubmit(Message.SubmitForm())],
            [
              fieldView('name', 'Name', model.name, (value) => Message.UpdateName({ value })),
              fieldView(
                'email',
                'Email',
                model.email,
                (value) => Message.UpdateEmail({ value }),
                'email',
              ),
              fieldView(
                'message',
                "Anything you'd like to share with us?",
                model.message,
                (value) => Message.UpdateMessage({ value }),
                'textarea',
              ),

              button(
                [
                  Type('submit'),
                  Disabled(!canSubmit),
                  Class(
                    `w-full py-2 px-4 rounded-md transition ${
                      canSubmit
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`,
                  ),
                ],
                [Submission.$is('Submitting')(model.submission) ? 'Joining...' : 'Join Waitlist'],
              ),
            ],
          ),

          Submission.$match(model.submission, {
            NotSubmitted: () => empty,
            Submitting: () => empty,
            SubmitSuccess: ({ message }) =>
              div(
                [Class('mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg')],
                [message],
              ),
            SubmitError: ({ error }) =>
              div(
                [Class('mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg')],
                [error],
              ),
          }),
        ],
      ),
    ],
  )
}

// RUN

const app = makeElement({
  init,
  update,
  view,
  container: document.body,
})

Effect.runFork(app)
