import { Command } from 'foldkit'
import { evo } from 'foldkit/struct'

// UPDATE

const update = (model: Model, message: Message) =>
  Message.match<readonly [Model, ReadonlyArray<Command.Command<Message>>]>(
    message,
    {
      ClickedDecrement: () => [evo(model, { count: count => count - 1 }), []],
      ClickedIncrement: () => [evo(model, { count: count => count + 1 }), []],
      ClickedReset: () => [evo(model, { count: () => 0 }), []],
    },
  )
