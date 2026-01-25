import { Effect, Match, Random } from 'effect'
import { Runtime } from 'foldkit'

import { GRID_SIZE } from './constants'
import { GotApplePosition, Message, SpawnApple } from './message'
import { Model } from './model'

// ✅ Do this - request the value via a Command
const update = (model: Model, message: Message) =>
  Match.value(message).pipe(
    Match.tagsExhaustive({
      SpawnApple: () => [model, [generateApplePosition]],
      GotApplePosition: ({ position }) => [
        { ...model, apple: position },
        [],
      ],
    }),
  )

// The Command that performs the side effect
const generateApplePosition: Runtime.Command<Message> = Effect.gen(
  function* () {
    const x = yield* Random.nextIntBetween(0, GRID_SIZE)
    const y = yield* Random.nextIntBetween(0, GRID_SIZE)
    return GotApplePosition.make({ position: { x, y } })
  },
)

// Same inputs always produce the same outputs - purity preserved!
const model = { snake: [{ x: 0, y: 0 }], apple: { x: 5, y: 5 } }
const message = SpawnApple.make()

console.log(update(model, message)) // [model, [generateApplePosition]]
console.log(update(model, message)) // [model, [generateApplePosition]]
console.log(update(model, message)) // [model, [generateApplePosition]]
