import { KeyValueStore } from '@effect/platform'
import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Effect, Schema as S } from 'effect'
import { Runtime } from 'foldkit'
import { ts } from 'foldkit/schema'

import { SESSION_STORAGE_KEY } from './constant'
import { Session } from './domain/session'

const SessionSaved = ts('SessionSaved')
const SessionCleared = ts('SessionCleared')

export type SessionSaved = typeof SessionSaved.Type
export type SessionCleared = typeof SessionCleared.Type

export const saveSession = (session: Session): Runtime.Command<SessionSaved> =>
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    yield* store.set(
      SESSION_STORAGE_KEY,
      S.encodeSync(S.parseJson(Session))(session),
    )
    return SessionSaved.make()
  }).pipe(
    Effect.catchAll(() => Effect.succeed(SessionSaved.make())),
    Effect.provide(BrowserKeyValueStore.layerLocalStorage),
  )

export const clearSession = (): Runtime.Command<SessionCleared> =>
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    yield* store.remove(SESSION_STORAGE_KEY)
    return SessionCleared.make()
  }).pipe(
    Effect.catchAll(() => Effect.succeed(SessionCleared.make())),
    Effect.provide(BrowserKeyValueStore.layerLocalStorage),
  )

export { SessionSaved, SessionCleared }
