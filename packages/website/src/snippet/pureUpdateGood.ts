import { Effect, Random } from 'effect'
import { Command } from 'foldkit'
import { evo } from 'foldkit/struct'

import { GRID_SIZE } from './constants'
import { Message } from './message'
import type { Model } from './model'

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

// ✅ Run random work in a Command
const GenerateApplePosition = Command.define('GenerateApplePosition', {
  messages: [Message.CompletedGenerateApplePosition],
  execute: Effect.gen(function* () {
    const x = yield* Random.nextIntBetween(0, GRID_SIZE, { halfOpen: true })
    const y = yield* Random.nextIntBetween(0, GRID_SIZE, { halfOpen: true })
    return Message.CompletedGenerateApplePosition({ position: { x, y } })
  }),
})

const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    RequestedApple: () => [model, [GenerateApplePosition()]],
    CompletedGenerateApplePosition: ({ position }) => [
      evo(model, { apple: () => position }),
      [],
    ],
  })
