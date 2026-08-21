import { type Command } from 'foldkit'
import { evo } from 'foldkit/struct'

import { GRID_SIZE } from './constants'
import { Message } from './message'
import type { Model } from './model'

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

// ❌ Don't call random directly in update
const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    RequestedApple: () => {
      const x = Math.floor(Math.random() * GRID_SIZE)
      const y = Math.floor(Math.random() * GRID_SIZE)
      return [evo(model, { apple: () => ({ x, y }) }), []]
    },
  })
