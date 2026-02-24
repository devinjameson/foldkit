import { Match as M } from 'effect'
import { Command } from 'foldkit/command'

// UPDATE - How your state changes in response to messages
// Returns a tuple of [nextModel, commands]
// Commands are side effects like HTTP requests (none needed here)

const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Command<Message>>]>(),
    M.tagsExhaustive({
      // This means: the next model (application state) is
      // model - 1 and there are no commands to run
      ClickedDecrement: () => [model - 1, []],
      ClickedIncrement: () => [model + 1, []],
      ClickedReset: () => [0, []],
    }),
  )
