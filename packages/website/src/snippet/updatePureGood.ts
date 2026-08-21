import { Effect } from 'effect'
import { Command } from 'foldkit'
import * as Dom from 'foldkit/dom'
import { evo } from 'foldkit/struct'

import { Message } from './message'
import type { Model } from './model'

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const FocusSearchInput = Command.define('FocusSearchInput', {
  messages: [Message.CompletedFocusSearchInput],
  execute: Dom.focus('#search-input').pipe(
    Effect.ignore,
    Effect.as(Message.CompletedFocusSearchInput()),
  ),
})

// ✅ Return the next Model and a Command
const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    OpenedDialog: () => [
      evo(model, { dialogState: () => 'Open' }),
      [FocusSearchInput()],
    ],
    CompletedFocusSearchInput: () => [model, []],
  })
