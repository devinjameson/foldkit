import { KeyValueStore } from '@effect/platform'
import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Console, Effect, Schema as S } from 'effect'
import { Runtime } from 'foldkit'

import { SESSION_STORAGE_KEY } from './constant'
import { Session } from './domain/session'
import {
  NoOp,
  SessionClearFailed,
  SessionCleared,
  SessionSaveFailed,
  SessionSaved,
} from './message'

export const saveSession = (
  session: Session,
): Runtime.Command<SessionSaved | SessionSaveFailed> =>
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    yield* store.set(
      SESSION_STORAGE_KEY,
      S.encodeSync(S.parseJson(Session))(session),
    )
    return SessionSaved.make()
  }).pipe(
    Effect.catchAll((error) =>
      Effect.succeed(SessionSaveFailed.make({ error: String(error) })),
    ),
    Effect.provide(BrowserKeyValueStore.layerLocalStorage),
  )

export const clearSession = (): Runtime.Command<
  SessionCleared | SessionClearFailed
> =>
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    yield* store.remove(SESSION_STORAGE_KEY)
    return SessionCleared.make()
  }).pipe(
    Effect.catchAll((error) =>
      Effect.succeed(SessionClearFailed.make({ error: String(error) })),
    ),
    Effect.provide(BrowserKeyValueStore.layerLocalStorage),
  )

export const logError = (
  ...args: ReadonlyArray<unknown>
): Runtime.Command<NoOp> => Console.error(...args).pipe(Effect.as(NoOp.make()))
