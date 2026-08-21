import { Match as M } from 'effect'
import { type Command } from 'foldkit'
import { evo } from 'foldkit/struct'

import type { Message } from './message'
import type { Model } from './model'

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

// ❌ Don't do this in update
const update = (model: Model, message: Message) =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      OpenedDialog: () => {
        document.querySelector<HTMLInputElement>('#search-input')?.focus()
        return [evo(model, { dialogState: () => 'Open' }), []]
      },
    }),
  )
