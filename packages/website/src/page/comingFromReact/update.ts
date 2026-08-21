import { Record } from 'effect'
import { Command } from 'foldkit'

import { Message } from './message'
import type { Model } from './model'

export type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message>>,
]

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ToggledFaq: ({ id, isOpen }) => [Record.set(model, id, isOpen), []],
  })
