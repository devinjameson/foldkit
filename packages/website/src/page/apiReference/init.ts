import { Command } from 'foldkit'

import { Message } from './message'
import { ApiDataAsyncData, type Model } from './model'
import { update } from './update'

export type InitReturn = [Model, ReadonlyArray<Command.Command<Message>>]

export const init = (): InitReturn => [
  {
    apiData: ApiDataAsyncData.Idle(),
    disclosures: {},
  },
  [],
]

export const boot = (): InitReturn => {
  const [model, initCommands] = init()
  const [bootedModel, bootCommands] = update(model, Message.RequestedApiData())
  return [bootedModel, [...initCommands, ...bootCommands]]
}
