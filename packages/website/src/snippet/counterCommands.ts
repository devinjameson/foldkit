import { Match as M } from 'effect'
import { Runtime, Task } from 'foldkit'

const ClickedResetAfterDelay = ts('ClickedResetAfterDelay')
const ElapsedResetDelay = ts('ElapsedResetDelay')

const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Runtime.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      [Model, ReadonlyArray<Runtime.Command<Message>>]
    >(),
    M.tagsExhaustive({
      ClickedResetAfterDelay: () => [
        model,
        [Task.delay('1 second', () => ElapsedResetDelay())],
      ],
      ElapsedResetDelay: () => [0, []],
    }),
  )
