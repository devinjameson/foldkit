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
): [Model, Runtime.Command<Message>[]] =>
  M.value(message).pipe(
    M.withReturnType<[Model, Runtime.Command<Message>[]]>(),
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
    // tryPromise creates an Effect that represents an asynchronous computation
    // that might fail. If the Promise rejects, it is propagated to the error channel
    // in the Effect as UnknownException.
    // https://effect.website/docs/getting-started/creating-effects/#trypromise
    const result = yield* Effect.tryPromise(() =>
      fetch('/api/count').then((res) => {
        if (!res.ok) throw new Error('API request failed')
        // NOTE: We would not cast in a real application. Instead, we would
        // decode the JSON using Effect Schema. For simplicity, we skip that here.
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        return res.json() as unknown as { count: number }
      }),
    )

    // If we reach this, the Effect above that uses tryPromise succeeded,
    // and we can return the GetCountSuccess message
    return GetCountSuccess.make({ count: result.count })
  }).pipe(
    // We are forced by the type system to handle the error case because
    // Command's may not fail. They must always return a Message. Here, we recover
    // from failure by returning a GetCountFailure Message with the error message.
    // In a real application, we might log the error to an external service,
    // retry the request, etc.
    Effect.catchAll((error) =>
      Effect.succeed(GetCountFailure.make({ error: error.message })),
    ),
  )
