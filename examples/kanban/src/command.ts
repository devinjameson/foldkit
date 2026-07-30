import { Crypto, Effect, Schema as S } from 'effect'
import { KeyValueStore } from 'effect/unstable/persistence'
import { Command, Dom } from 'foldkit'

import { BrowserCrypto, BrowserKeyValueStore } from '@effect/platform-browser'

import { ADD_CARD_INPUT_ID, STORAGE_KEY } from './constant'
import { Column } from './domain'
import {
  CompletedFocusAddCardInput,
  CompletedGenerateCardId,
  CompletedSaveBoard,
} from './message'
import { SavedBoard } from './model'

export const GenerateCardId = Command.define('GenerateCardId', {
  args: { columnId: S.String, title: S.String },
  messages: [CompletedGenerateCardId],
  execute: ({ columnId, title }) =>
    Effect.gen(function* () {
      const crypto = yield* Crypto.Crypto
      const cardId = yield* Effect.orDie(crypto.randomUUIDv4)
      return CompletedGenerateCardId({ cardId, columnId, title })
    }).pipe(Effect.provide(BrowserCrypto.layer)),
})

export const SaveBoard = Command.define('SaveBoard', {
  args: { columns: S.Array(Column.Column) },
  messages: [CompletedSaveBoard],
  execute: ({ columns }) =>
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
      yield* store.set(
        STORAGE_KEY,
        S.encodeSync(S.fromJsonString(SavedBoard))({ columns }),
      )
      return CompletedSaveBoard()
    }).pipe(
      Effect.catch(() => Effect.succeed(CompletedSaveBoard())),
      Effect.provide(BrowserKeyValueStore.layerLocalStorage),
    ),
})

export const FocusAddCardInput = Command.define('FocusAddCardInput', {
  messages: [CompletedFocusAddCardInput],
  execute: Dom.focus(`#${ADD_CARD_INPUT_ID}`).pipe(
    Effect.ignore,
    Effect.as(CompletedFocusAddCardInput()),
  ),
})
