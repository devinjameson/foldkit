import { Match as M } from 'effect'
import { Runtime } from 'foldkit'

// UPDATE - How your state changes in response to messages
// Returns a tuple of [nextModel, commands]
// Commands are side effects like HTTP requests (none needed here)

const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Runtime.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      [Model, ReadonlyArray<Runtime.Command<Message>>]
    >(),
    M.tagsExhaustive({
      // This means: the next model (application state) is
      // model - 1 and there are no commands to run
      Decrement: () => [model - 1, []],
      Increment: () => [model + 1, []],
      Reset: () => [0, []],
    }),
  )
