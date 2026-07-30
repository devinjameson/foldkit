import { Effect, Schema as S } from 'effect'
import { HttpClient } from 'effect/unstable/http'
import { Command, Http } from 'foldkit'

const FetchWeather = Command.define('FetchWeather', {
  args: { city: S.String },
  messages: [SucceededFetchWeather, FailedFetchWeather],
  execute: ({ city }) =>
    Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient
      const response = yield* client.get(`https://api.weather.com/${city}`)
      const data = yield* S.decodeUnknownEffect(WeatherResponse)(
        yield* response.json,
      )
      return SucceededFetchWeather({ weather: data })
    }).pipe(
      Effect.catch(() =>
        Effect.succeed(FailedFetchWeather({ error: 'Request failed' })),
      ),
      Effect.provide(Http.layer),
    ),
})
