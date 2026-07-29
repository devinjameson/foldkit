import { Console, Effect, Schema as S } from 'effect'
import { KeyValueStore } from 'effect/unstable/persistence'
import { Command } from 'foldkit'

import { BrowserKeyValueStore } from '@effect/platform-browser'

import { SESSION_STORAGE_KEY } from './constant'
import { Session } from './domain/session'
import {
  CompletedLogError,
  FailedClearSession,
  FailedSaveSession,
  SucceededClearSession,
  SucceededSaveSession,
} from './message'

export const SaveSession = Command.define('SaveSession', {
  args: { session: Session },
  messages: [SucceededSaveSession, FailedSaveSession],
  execute: ({ session }) =>
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
      yield* store.set(
        SESSION_STORAGE_KEY,
        S.encodeSync(S.fromJsonString(Session))(session),
      )
      return SucceededSaveSession()
    }).pipe(
      Effect.catch(error =>
        Effect.succeed(FailedSaveSession({ error: String(error) })),
      ),
      Effect.provide(BrowserKeyValueStore.layerLocalStorage),
    ),
})

export const ClearSession = Command.define('ClearSession', {
  messages: [SucceededClearSession, FailedClearSession],
  execute: Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    yield* store.remove(SESSION_STORAGE_KEY)
    return SucceededClearSession()
  }).pipe(
    Effect.catch(error =>
      Effect.succeed(FailedClearSession({ error: String(error) })),
    ),
    Effect.provide(BrowserKeyValueStore.layerLocalStorage),
  ),
})

export const LogError = Command.define('LogError', {
  args: { entries: S.Array(S.Unknown) },
  messages: [CompletedLogError],
  execute: ({ entries }) =>
    Console.error(...entries).pipe(Effect.as(CompletedLogError())),
})
