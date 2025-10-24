import { Effect, Match as M } from 'effect'
import { Runtime } from 'foldkit'

// Add a new Message for the reset after delay
const ResetAfterDelay = ts('ResetDelayed')
const ResetNow = ts('ResetNow')

type ResetAfterDelay = ST<typeof ResetAfterDelay>
type ResetNow = ST<typeof ResetNow>

const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Runtime.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      [Model, ReadonlyArray<Runtime.Command<Message>>]
    >(),
    M.tagsExhaustive({
      // When user clicks "Reset", don't reset immediately.
      // Instead, return a Command that sleeps for 1 second
      // and then returns the ResetNow message.
      ResetAfterDelay: () => [model, [resetAfterDelay]],
      ResetNow: () => [0, []],
    }),
  )

// A Command is an Effect that returns a Message
// This Command sleeps for 1 second and then returns the ResetNow message
const resetAfterDelay: Runtime.Command<ResetNow> = Effect.gen(
  function* () {
    yield* Effect.sleep('1 second')
    return ResetNow.make()
  },
)
