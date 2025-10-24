import { Effect, Match as M, Schema } from 'effect'
import { Runtime } from 'foldkit'
import { ST, ts } from 'foldkit/schema'

const GetCountFromAPI = ts('GetCountFromAPI')
const GetCountSuccess = ts('GetCountSuccess', {
  count: Schema.Number,
})
const GetCountFailure = ts('GetCountFailure', {
  error: Schema.String,
})

type GetCountFromAPI = ST<typeof GetCountFromAPI>
type GetCountSuccess = ST<typeof GetCountSuccess>
type GetCountFailure = ST<typeof GetCountFailure>

const update = (
  model: Model,
  message: Message,
): [Model, Array<Runtime.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<[Model, Array<Runtime.Command<Message>>]>(),
    M.tagsExhaustive({
      // Tell Foldkit to fetch the count from the API
      GetCountFromAPI: () => [model, [fetchCount]],
      // Update the count on successful API response
      GetCountSuccess: ({ count }) => [count, []],
      // Keep the current count on failure
      GetCountFailure: ({ error }) => {
        // We could also update our model to include the error message
        // and display it in the view.
        return [model, []]
      },
    }),
  )

// Command that fetches the count from an API
const fetchCount: Runtime.Command<GetCountSuccess | GetCountFailure> =
  Effect.gen(function* () {
    const result = yield* Effect.tryPromise(() =>
      fetch('/api/count').then((res) => {
        if (!res.ok) throw new Error('API request failed')
        return res.json() as unknown as { count: number }
      }),
    )
    return GetCountSuccess.make({ count: result.count })
  }).pipe(
    Effect.catchAll((error) =>
      Effect.succeed(GetCountFailure.make({ error: error.message })),
    ),
  )
