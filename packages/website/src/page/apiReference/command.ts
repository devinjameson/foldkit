import { Effect, Schema as S } from 'effect'
import { Command } from 'foldkit'

import { ParsedApiReference } from './domain'
import { FailedLoadApiData, SucceededLoadApiData } from './message'

/** Loads the generated API reference data, producing the parsed reference on
 *  success or a failure Message when the fetch or decode does not complete. */
export const LoadApiData = Command.define('LoadApiData', {
  messages: [SucceededLoadApiData, FailedLoadApiData],
  execute: Effect.gen(function* () {
    const [parsedApiModule, highlightsModule] = yield* Effect.tryPromise({
      try: () =>
        Promise.all([
          import('virtual:parsed-api'),
          import('virtual:api-highlights'),
        ]),
      catch: error =>
        error instanceof Error ? error.message : 'Unknown error',
    })

    const parsedApi = S.decodeUnknownSync(ParsedApiReference)(
      parsedApiModule.default,
    )

    return SucceededLoadApiData({
      apiData: {
        parsedApi,
        highlights: highlightsModule.default,
      },
    })
  }).pipe(
    Effect.catch(error =>
      Effect.succeed(
        FailedLoadApiData({
          error: typeof error === 'string' ? error : 'Failed to load API data',
        }),
      ),
    ),
  ),
})
