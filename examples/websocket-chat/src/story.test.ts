import { DateTime } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import {
  ClickedConnect,
  Connected,
  ConnectionConnected,
  ConnectionConnecting,
  ConnectionDisconnected,
  Disconnected,
  FailedConnect,
  type Model,
  ReceivedMessage,
  SendMessage,
  SubmittedMessage,
  SucceededSendMessage,
  TimestampReceivedMessage,
  TimestampSentMessage,
  TimestampedMessage,
  UpdatedMessageInput,
  update,
} from './main'

const idleModel: Model = {
  connection: ConnectionDisconnected(),
  messages: [],
  messageInput: '',
}

const connectedModel: Model = {
  ...idleModel,
  connection: ConnectionConnected(),
}

const zonedNow = DateTime.makeZonedUnsafe(0, { timeZone: 'UTC' })

describe('update', () => {
  describe('connection state', () => {
    test('ClickedConnect moves into ConnectionConnecting', () => {
      story(
        update,
        given(idleModel),
        message(ClickedConnect()),
        model(model => {
          expect(model.connection._tag).toBe('ConnectionConnecting')
        }),
      )
    })

    test('Connected moves into ConnectionConnected', () => {
      story(
        update,
        given({ ...idleModel, connection: ConnectionConnecting() }),
        message(Connected()),
        model(model => {
          expect(model.connection._tag).toBe('ConnectionConnected')
        }),
      )
    })

    test('Disconnected returns to ConnectionDisconnected and clears messages', () => {
      story(
        update,
        given({
          ...connectedModel,
          messages: [{ text: 'old', zoned: zonedNow, isSent: true }],
        }),
        message(Disconnected()),
        model(model => {
          expect(model.connection._tag).toBe('ConnectionDisconnected')
          expect(model.messages).toHaveLength(0)
        }),
      )
    })

    test('FailedConnect captures the error message', () => {
      story(
        update,
        given({ ...idleModel, connection: ConnectionConnecting() }),
        message(FailedConnect({ error: 'Timeout' })),
        model(model => {
          if (model.connection._tag === 'ConnectionError') {
            expect(model.connection.error).toBe('Timeout')
          } else {
            throw new Error('Expected ConnectionError')
          }
        }),
      )
    })
  })

  describe('message input', () => {
    test('UpdatedMessageInput stores the new input value', () => {
      story(
        update,
        given(connectedModel),
        message(UpdatedMessageInput({ value: 'Hello' })),
        model(model => {
          expect(model.messageInput).toBe('Hello')
        }),
      )
    })
  })

  describe('SubmittedMessage', () => {
    test('an empty input is ignored', () => {
      story(
        update,
        given({ ...connectedModel, messageInput: '' }),
        message(SubmittedMessage()),
        Command.expectNone(),
      )
    })

    test('whitespace-only input is ignored', () => {
      story(
        update,
        given({ ...connectedModel, messageInput: '   ' }),
        message(SubmittedMessage()),
        Command.expectNone(),
      )
    })

    test('connected client fires SendMessage and clears the input', () => {
      story(
        update,
        given({ ...connectedModel, messageInput: 'Hello there' }),
        message(SubmittedMessage()),
        model(model => {
          expect(model.messageInput).toBe('')
        }),
        Command.expectHas(SendMessage),
        Command.resolve(
          SendMessage,
          SucceededSendMessage({ text: 'Hello there' }),
        ),
        Command.expectHas(TimestampSentMessage),
        Command.resolve(
          TimestampSentMessage,
          TimestampedMessage({
            text: 'Hello there',
            zoned: zonedNow,
            isSent: true,
          }),
        ),
        model(model => {
          expect(model.messages).toHaveLength(1)
          expect(model.messages[0]?.text).toBe('Hello there')
          expect(model.messages[0]?.isSent).toBe(true)
        }),
      )
    })

    test('disconnected client ignores SubmittedMessage', () => {
      story(
        update,
        given({ ...idleModel, messageInput: 'Hello' }),
        message(SubmittedMessage()),
        Command.expectNone(),
        model(model => {
          expect(model.messageInput).toBe('Hello')
        }),
      )
    })
  })

  describe('inbound messages', () => {
    test('ReceivedMessage queues TimestampReceivedMessage that appends to the list', () => {
      story(
        update,
        given(connectedModel),
        message(ReceivedMessage({ text: 'echo' })),
        Command.expectHas(TimestampReceivedMessage),
        Command.resolve(
          TimestampReceivedMessage,
          TimestampedMessage({
            text: 'echo',
            zoned: zonedNow,
            isSent: false,
          }),
        ),
        model(model => {
          expect(model.messages).toHaveLength(1)
          expect(model.messages[0]?.isSent).toBe(false)
          expect(model.messages[0]?.text).toBe('echo')
        }),
      )
    })
  })
})
