import { Effect, Match as M } from 'effect'
import { Command } from 'foldkit'
import * as Dom from 'foldkit/dom'
import { evo } from 'foldkit/struct'

import { CompletedFocusSearchInput, type Message } from './message'
import type { Model } from './model'

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const FocusSearchInput = Command.define('FocusSearchInput', {
  messages: [CompletedFocusSearchInput],
  execute: Dom.focus('#search-input').pipe(
    Effect.ignore,
    Effect.as(CompletedFocusSearchInput()),
  ),
})

// ✅ Return the next Model and a Command
const update = (model: Model, message: Message) =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      OpenedDialog: () => [
        evo(model, { dialogState: () => 'Open' }),
        [FocusSearchInput()],
      ],
      CompletedFocusSearchInput: () => [model, []],
    }),
  )
