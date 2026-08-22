import { Effect, Option, Schema as S } from 'effect'

import * as Command from '../../command/index.js'
import { defineMessageUnion } from '../../message/index.js'

// CHILD MODEL

export const ChildModel = S.Struct({
  status: S.Literals(['Idle', 'Submitting', 'Submitted']),
})
export type ChildModel = typeof ChildModel.Type

// CHILD MESSAGE

export const ChildMessage = defineMessageUnion({
  SubmittedForm: {},
  SucceededSubmitForm: { id: S.String },
  CancelledForm: {},
  CompletedResetForm: {},
})

export const {
  SubmittedForm,
  SucceededSubmitForm,
  CancelledForm,
  CompletedResetForm,
} = ChildMessage

export type ChildMessage = typeof ChildMessage.Type

// CHILD OUT MESSAGE

export const ChildOutMessage = defineMessageUnion({
  RequestedSave: { id: S.String },
  RequestedCancel: {},
})

export const { RequestedSave, RequestedCancel } = ChildOutMessage

export type ChildOutMessage = typeof ChildOutMessage.Type

// CHILD COMMAND

export const SubmitForm = Command.define('SubmitForm', {
  messages: [ChildMessage.SucceededSubmitForm],
  execute: Effect.sync(() => ChildMessage.SucceededSubmitForm({ id: 'abc' })),
})

export const ResetForm = Command.define('ResetForm', {
  messages: [ChildMessage.CompletedResetForm],
  execute: Effect.sync(() => ChildMessage.CompletedResetForm()),
})

// CHILD INIT

export const initialChildModel: ChildModel = { status: 'Idle' }

// CHILD UPDATE

export const childUpdate = (
  _model: ChildModel,
  message: ChildMessage,
): readonly [
  ChildModel,
  ReadonlyArray<Command.Command<ChildMessage>>,
  Option.Option<ChildOutMessage>,
] =>
  ChildMessage.match<
    readonly [
      ChildModel,
      ReadonlyArray<Command.Command<ChildMessage>>,
      Option.Option<ChildOutMessage>,
    ]
  >(message, {
    SubmittedForm: () => [
      { status: 'Submitting' },
      [SubmitForm()],
      Option.none(),
    ],
    SucceededSubmitForm: ({ id }) => [
      { status: 'Submitted' },
      [ResetForm()],
      Option.some(ChildOutMessage.RequestedSave({ id })),
    ],
    CancelledForm: () => [
      { status: 'Idle' },
      [],
      Option.some(ChildOutMessage.RequestedCancel()),
    ],
    CompletedResetForm: () => [{ status: 'Idle' }, [], Option.none()],
  })

// PARENT MODEL

export const ParentModel = S.Struct({
  child: ChildModel,
  savedIds: S.Array(S.String),
  cancelled: S.Boolean,
})
export type ParentModel = typeof ParentModel.Type

// PARENT MESSAGE

export const ParentMessage = defineMessageUnion({
  GotChildMessage: { message: ChildMessage },
  CompletedParentReset: {},
})

export const { GotChildMessage, CompletedParentReset } = ParentMessage

export type ParentMessage = typeof ParentMessage.Type

// PARENT INIT

export const initialParentModel: ParentModel = {
  child: { status: 'Idle' },
  savedIds: [],
  cancelled: false,
}

// PARENT UPDATE

export const parentUpdate = (
  parentModel: ParentModel,
  message: ParentMessage,
): readonly [ParentModel, ReadonlyArray<Command.Command<ParentMessage>>] =>
  ParentMessage.match<
    readonly [ParentModel, ReadonlyArray<Command.Command<ParentMessage>>]
  >(message, {
    GotChildMessage: ({ message: childMessage }) => {
      const [nextChild, commands, maybeOutMessage] = childUpdate(
        parentModel.child,
        childMessage,
      )
      const nextParent = Option.match(maybeOutMessage, {
        onNone: () => ({ ...parentModel, child: nextChild }),
        onSome: outMessage =>
          ChildOutMessage.match<ParentModel>(outMessage, {
            RequestedSave: ({ id }) => ({
              ...parentModel,
              child: nextChild,
              savedIds: [...parentModel.savedIds, id],
            }),
            RequestedCancel: () => ({
              ...parentModel,
              child: nextChild,
              cancelled: true,
            }),
          }),
      })
      const mappedCommands = Command.mapMessages(commands, childMessage =>
        ParentMessage.GotChildMessage({ message: childMessage }),
      )
      return [nextParent, mappedCommands]
    },
    CompletedParentReset: () => [parentModel, []],
  })
