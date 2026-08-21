import { Option } from 'effect'
import { Command } from 'foldkit'

import { Message, OutMessage } from './message'
import { Model } from './model'

type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message>>,
  Option.Option<OutMessage>,
]

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedLogout: () => [model, [], Option.some(OutMessage.RequestedLogout())],
  })
