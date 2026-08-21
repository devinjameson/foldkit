import { Match as M, Option, Schema as S } from 'effect'
import { Command, Update } from 'foldkit'
import {
  Field,
  NotValidated,
  allValid,
  anyInvalid,
  makeRules,
  validate,
} from 'foldkit/fieldValidation'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Listbox } from '@foldkit/ui'

import { revealFieldErrors } from '../validation'

// FIELD VALIDATION

export const schoolRules = makeRules({
  required: 'School is required',
})

export const degreeRules = makeRules({
  required: 'Degree is required',
})

export const fieldOfStudyRules = makeRules({
  required: 'Field of study is required',
})

const validateSchool = validate(schoolRules)
const validateDegree = validate(degreeRules)
const validateFieldOfStudy = validate(fieldOfStudyRules)

// MODEL

export const Model = S.Struct({
  id: S.String,
  school: Field(S.String),
  degree: Field(S.String),
  fieldOfStudy: Field(S.String),
  maybeGraduationYear: S.Option(S.String),
  graduationYearListbox: Listbox.Model,
  isCurrentlyEnrolled: S.Boolean,
})
export type Model = typeof Model.Type

const GraduationYearListbox = Listbox.create<string>()

// MESSAGE

export const Message = defineMessageUnion({
  UpdatedSchool: { value: S.String },
  UpdatedDegree: { value: S.String },
  UpdatedFieldOfStudy: { value: S.String },
  GotGraduationYearListboxMessage: { message: Listbox.Message },
  ToggledCurrentlyEnrolled: { isChecked: S.Boolean },
  ClickedRemoveSelf: {},
})

export type Message = typeof Message.Type

// OUT MESSAGE

export const OutMessage = defineMessageUnion({
  Removed: {},
})

export type OutMessage = typeof OutMessage.Type

export type Removed = typeof OutMessage.Removed.Type

// INIT

export const init = (entryId: string): Model => ({
  id: entryId,
  school: NotValidated({ value: '' }),
  degree: NotValidated({ value: '' }),
  fieldOfStudy: NotValidated({ value: '' }),
  maybeGraduationYear: Option.none(),
  graduationYearListbox: Listbox.init({
    id: `${entryId}-graduation-year`,
  }),
  isCurrentlyEnrolled: false,
})

// UPDATE

type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message>>,
  Option.Option<OutMessage>,
]

const foldGraduationYearListboxOutMessage = M.type<Listbox.OutMessage>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    Selected:
      ({ value }) =>
      model => [
        evo(model, { maybeGraduationYear: () => Option.some(value) }),
        [],
      ],
  }),
)

const foldGraduationYearListbox = Update.foldChild({
  update: GraduationYearListbox.update,
  read: (model: Model) => Option.some(model.graduationYearListbox),
  write: (model, nextGraduationYearListbox) =>
    evo(model, { graduationYearListbox: () => nextGraduationYearListbox }),
  toParentMessage: message =>
    Message.GotGraduationYearListboxMessage({ message }),
  toParentOutMessage: () => Option.none(),
  foldOutMessage: foldGraduationYearListboxOutMessage,
})

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    UpdatedSchool: ({ value }) => [
      evo(model, { school: () => validateSchool(value) }),
      [],
      Option.none(),
    ],

    UpdatedDegree: ({ value }) => [
      evo(model, { degree: () => validateDegree(value) }),
      [],
      Option.none(),
    ],

    UpdatedFieldOfStudy: ({ value }) => [
      evo(model, { fieldOfStudy: () => validateFieldOfStudy(value) }),
      [],
      Option.none(),
    ],

    GotGraduationYearListboxMessage: ({ message }) =>
      foldGraduationYearListbox(model, message),

    ToggledCurrentlyEnrolled: ({ isChecked }) => [
      evo(model, { isCurrentlyEnrolled: () => isChecked }),
      [],
      Option.none(),
    ],

    ClickedRemoveSelf: () => [model, [], Option.some(OutMessage.Removed())],
  })

// VALIDATION SUMMARY

export const hasErrors = (entry: Model): boolean =>
  anyInvalid([entry.school, entry.degree, entry.fieldOfStudy])

export const isComplete = (entry: Model): boolean =>
  allValid([
    [entry.school, schoolRules],
    [entry.degree, degreeRules],
    [entry.fieldOfStudy, fieldOfStudyRules],
  ])

export const revealErrors = (entry: Model): Model =>
  evo(entry, {
    school: revealFieldErrors(schoolRules),
    degree: revealFieldErrors(degreeRules),
    fieldOfStudy: revealFieldErrors(fieldOfStudyRules),
  })
