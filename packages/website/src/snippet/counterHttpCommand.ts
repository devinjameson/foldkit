import { Effect, Match as M, Schema } from 'effect'
import { Runtime } from 'foldkit'
import { ts } from 'foldkit/schema'

const ClickedFetchCount = ts('ClickedFetchCount')
const SucceededCountFetch = ts('SucceededCountFetch', {
  count: Schema.Number,
})
const FailedCountFetch = ts('FailedCountFetch', {
  error: Schema.String,
})

const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Runtime.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      [Model, ReadonlyArray<Runtime.Command<Message>>]
    >(),
    M.tagsExhaustive({
      // Tell Foldkit to fetch the count from the API
      ClickedFetchCount: () => [model, [fetchCount]],
      // Update the count on successful API response
      SucceededCountFetch: ({ count }) => [count, []],
      // Keep the current count on failure
      FailedCountFetch: ({ error }) => {
        // We could also update our model to include the error message
        // and display it in the view.
        return [model, []]
      },
    }),
  )

// Command that fetches the count from an API
const fetchCount: Runtime.Command<
  typeof SucceededCountFetch | typeof FailedCountFetch
> = Effect.gen(function* () {
  const result = yield* Effect.tryPromise(() =>
    fetch('/api/count').then((res) => {
      if (!res.ok) throw new Error('API request failed')
      return res.json() as unknown as { count: number }
    }),
  )
  return SucceededCountFetch({ count: result.count })
}).pipe(
  Effect.catchAll((error) =>
    Effect.succeed(FailedCountFetch({ error: error.message })),
  ),
)
