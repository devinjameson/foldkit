import { Console, Effect, Schema as S } from 'effect'
import { KeyValueStore } from 'effect/unstable/persistence'
import { Command } from 'foldkit'

import { BrowserKeyValueStore } from '@effect/platform-browser'

import { SESSION_STORAGE_KEY } from './constant'
import { Session } from './domain/session'
import { Message } from './message'

export const SaveSession = Command.define('SaveSession', {
  args: { session: Session },
  messages: [Message.SucceededSaveSession, Message.FailedSaveSession],
  execute: ({ session }) =>
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
      yield* store.set(
        SESSION_STORAGE_KEY,
        S.encodeSync(S.fromJsonString(Session))(session),
      )
      return Message.SucceededSaveSession()
    }).pipe(
      Effect.catch(error =>
        Effect.succeed(Message.FailedSaveSession({ error: String(error) })),
      ),
      Effect.provide(BrowserKeyValueStore.layerLocalStorage),
    ),
})

export const ClearSession = Command.define('ClearSession', {
  messages: [Message.SucceededClearSession, Message.FailedClearSession],
  execute: Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    yield* store.remove(SESSION_STORAGE_KEY)
    return Message.SucceededClearSession()
  }).pipe(
    Effect.catch(error =>
      Effect.succeed(Message.FailedClearSession({ error: String(error) })),
    ),
    Effect.provide(BrowserKeyValueStore.layerLocalStorage),
  ),
})

export const LogError = Command.define('LogError', {
  args: { entries: S.Array(S.Unknown) },
  messages: [Message.CompletedLogError],
  execute: ({ entries }) =>
    Console.error(...entries).pipe(Effect.as(Message.CompletedLogError())),
})
