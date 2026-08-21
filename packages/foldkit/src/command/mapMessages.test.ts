import { Array, Effect, Schema as S } from 'effect'
import { expect, expectTypeOf } from 'vitest'

import { describe, it } from '@effect/vitest'

import { defineMessageUnion } from '../message/index.js'
import * as Command from './index.js'

const ChildMessage = defineMessageUnion({
  CompletedFetchNotes: { noteCount: S.Number },
})
const ParentMessage = defineMessageUnion({
  GotNotesMessage: { message: ChildMessage },
})

type ChildMessage = typeof ChildMessage.Type
type ParentMessage = typeof ParentMessage.Type

const FetchNotes = Command.define('FetchNotes', {
  messages: [ChildMessage.CompletedFetchNotes],
  execute: Effect.succeed(ChildMessage.CompletedFetchNotes({ noteCount: 3 })),
})

const toGotNotesMessage = (message: ChildMessage): ParentMessage =>
  ParentMessage.GotNotesMessage({ message })

// NOTE: These helpers are the regression subjects. Each is generic over the
// Message types, where Command stays a deferred conditional, so each compiles
// only while the mappers are typed against Command itself rather than a
// structural command shape.
const liftCommands = <FromMessage, ToMessage>(
  commands: ReadonlyArray<Command.Command<FromMessage>>,
  toParent: (message: FromMessage) => ToMessage,
): ReadonlyArray<Command.Command<ToMessage>> =>
  Command.mapMessages(commands, toParent)

const liftCommand = <FromMessage, ToMessage>(
  command: Command.Command<FromMessage>,
  toParent: (message: FromMessage) => ToMessage,
): Command.Command<ToMessage> => Command.mapMessage(command, toParent)

const withCrashOnFailure = <Message>(
  command: Command.Command<Message>,
): Command.Command<Message> => Command.mapEffect(command, Effect.orDie)

describe('Command.mapMessages', () => {
  it('unifies with Command inside a combinator generic over both Message types', () => {
    const mappedCommands = liftCommands([FetchNotes()], toGotNotesMessage)

    const dispatchedMessages = Array.map(mappedCommands, command =>
      Effect.runSync(command.effect),
    )
    expect(dispatchedMessages).toEqual([
      ParentMessage.GotNotesMessage({
        message: ChildMessage.CompletedFetchNotes({ noteCount: 3 }),
      }),
    ])
  })

  it('infers the lifted Message type at a concrete data-first call site', () => {
    const mappedCommands = Command.mapMessages(
      [FetchNotes()],
      toGotNotesMessage,
    )
    expectTypeOf(mappedCommands).toEqualTypeOf<
      ReadonlyArray<Command.Command<ParentMessage>>
    >()
  })

  it('infers the lifted Message type through the curried form', () => {
    const mappedCommands = Command.mapMessages(toGotNotesMessage)([
      FetchNotes(),
    ])
    expectTypeOf(mappedCommands).toEqualTypeOf<
      ReadonlyArray<Command.Command<ParentMessage>>
    >()
  })
})

describe('Command.mapMessage', () => {
  it('unifies with Command inside a combinator generic over both Message types', () => {
    const mappedCommand = liftCommand(FetchNotes(), toGotNotesMessage)

    expect(mappedCommand.name).toBe('FetchNotes')
    expect(Effect.runSync(mappedCommand.effect)).toEqual(
      ParentMessage.GotNotesMessage({
        message: ChildMessage.CompletedFetchNotes({ noteCount: 3 }),
      }),
    )
  })
})

describe('Command.mapEffect', () => {
  it('unifies with Command inside a combinator generic over the Message type', () => {
    const mappedCommand = withCrashOnFailure(FetchNotes())

    expect(Effect.runSync(mappedCommand.effect)).toEqual(
      ChildMessage.CompletedFetchNotes({ noteCount: 3 }),
    )
  })
})
