import { Effect, Match as M, Random } from 'effect'
import { Command } from 'foldkit'
import { evo } from 'foldkit/struct'

import { GRID_SIZE } from './constants'
import { CompletedGenerateApplePosition, type Message } from './message'
import type { Model } from './model'

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

// ✅ Run random work in a Command
const GenerateApplePosition = Command.define('GenerateApplePosition', {
  messages: [CompletedGenerateApplePosition],
  execute: Effect.gen(function* () {
    const x = yield* Random.nextIntBetween(0, GRID_SIZE, { halfOpen: true })
    const y = yield* Random.nextIntBetween(0, GRID_SIZE, { halfOpen: true })
    return CompletedGenerateApplePosition({ position: { x, y } })
  }),
})

const update = (model: Model, message: Message) =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      RequestedApple: () => [model, [GenerateApplePosition()]],
      CompletedGenerateApplePosition: ({ position }) => [
        evo(model, { apple: () => position }),
        [],
      ],
    }),
  )
