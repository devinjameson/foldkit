import { FetchHttpClient, HttpClient } from '@effect/platform'
import { Array, Effect, Match as M, Schema as S, String, flow } from 'effect'
import { Runtime } from 'foldkit'
import { Html, html } from 'foldkit/html'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'

// MODEL

export const WeatherData = S.Struct({
  zipCode: S.String,
  temperature: S.Number,
  description: S.String,
  humidity: S.Number,
  windSpeed: S.Number,
  areaName: S.String,
  region: S.String,
})
export type WeatherData = typeof WeatherData.Type

export const WeatherInit = ts('WeatherInit')
export const WeatherLoading = ts('WeatherLoading')
export const WeatherSuccess = ts('WeatherSuccess', { data: WeatherData })
export const WeatherFailure = ts('WeatherFailure', { error: S.String })

const WeatherAsyncResult = S.Union(
  WeatherInit,
  WeatherLoading,
  WeatherSuccess,
  WeatherFailure,
)
type WeatherAsyncResult = typeof WeatherAsyncResult.Type

export const Model = S.Struct({
  zipCodeInput: S.String,
  weather: WeatherAsyncResult,
})
export type Model = typeof Model.Type

// MESSAGE

export const UpdatedZipCodeInput = ts('UpdatedZipCodeInput', {
  value: S.String,
})
export const SubmittedWeatherForm = ts('SubmittedWeatherForm')
export const SucceededWeatherFetch = ts('SucceededWeatherFetch', {
  weather: WeatherData,
})
export const FailedWeatherFetch = ts('FailedWeatherFetch', { error: S.String })

const Message = S.Union(
  UpdatedZipCodeInput,
  SubmittedWeatherForm,
  SucceededWeatherFetch,
  FailedWeatherFetch,
)
type Message = typeof Message.Type

export const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Runtime.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Runtime.Command<Message>>]>(),
    M.tagsExhaustive({
      UpdatedZipCodeInput: ({ value }) => [
        evo(model, {
          zipCodeInput: () => value,
        }),
        [],
      ],

      SubmittedWeatherForm: () => [
        evo(model, {
          weather: () => WeatherLoading(),
        }),
        [fetchWeatherLive(model.zipCodeInput)],
      ],

      SucceededWeatherFetch: ({ weather }) => [
        evo(model, {
          weather: () => WeatherSuccess({ data: weather }),
        }),
        [],
      ],

      FailedWeatherFetch: ({ error }) => [
        evo(model, {
          weather: () => WeatherFailure({ error }),
        }),
        [],
      ],
    }),
  )

// INIT

const init: Runtime.ElementInit<Model, Message> = () => [
  {
    zipCodeInput: '',
    weather: WeatherInit(),
  },
  [],
]

// COMMAND

type WeatherResponseData = {
  current_condition: Array.NonEmptyReadonlyArray<{
    temp_F: string
    humidity: string
    windspeedKmph: string
    weatherDesc: Array.NonEmptyReadonlyArray<{ value: string }>
  }>
  nearest_area: Array.NonEmptyReadonlyArray<{
    areaName: Array.NonEmptyReadonlyArray<{ value: string }>
    region: Array.NonEmptyReadonlyArray<{ value: string }>
  }>
}

export const fetchWeather = (
  zipCode: string,
): Runtime.Command<
  typeof SucceededWeatherFetch | typeof FailedWeatherFetch,
  never,
  HttpClient.HttpClient
> =>
  Effect.gen(function* () {
    if (String.isEmpty(zipCode.trim())) {
      return FailedWeatherFetch({ error: 'Zip code required' })
    }

    const client = yield* HttpClient.HttpClient
    const response = yield* client.get(
      `https://wttr.in/${encodeURIComponent(zipCode)},US?format=j1`,
    )

    if (response.status !== 200) {
      return FailedWeatherFetch({ error: 'Location not found' })
    }

    // In a real app, you'd define a Schema for WeatherResponseData and use
    // Schema.decodeUnknown to validate the response. We use a type assertion
    // here for brevity.
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const data = (yield* response.json) as WeatherResponseData
    const currentCondition = data.current_condition[0]
    const areaName = data.nearest_area[0].areaName[0].value
    const region = data.nearest_area[0].region[0].value

    const weather = WeatherData.make({
      zipCode,
      temperature: parseInt(currentCondition.temp_F),
      description: currentCondition.weatherDesc[0].value,
      humidity: parseInt(currentCondition.humidity),
      windSpeed: parseFloat(currentCondition.windspeedKmph),
      areaName,
      region,
    })

    return SucceededWeatherFetch({ weather })
  }).pipe(
    Effect.scoped,
    Effect.catchAll(() =>
      Effect.succeed(
        FailedWeatherFetch({ error: 'Failed to fetch weather data' }),
      ),
    ),
  )

const fetchWeatherLive = flow(
  fetchWeather,
  Effect.locally(HttpClient.currentTracerPropagation, false),
  Effect.provide(FetchHttpClient.layer),
)

// VIEW

const {
  article,
  button,
  div,
  empty,
  form,
  h1,
  h2,
  input,
  label,
  p,
  Class,
  Disabled,
  For,
  Id,
  OnInput,
  OnSubmit,
  Placeholder,
  Type,
} = html<Message>()

const view = (model: Model): Html =>
  div(
    [
      Class(
        'min-h-screen bg-gradient-to-br from-blue-100 to-blue-300 flex flex-col items-center justify-center gap-6 p-6',
      ),
    ],
    [
      h1([Class('text-4xl font-bold text-blue-900 mb-8')], ['Weather']),

      form(
        [
          Class('flex flex-col gap-4 items-center w-full max-w-md'),
          OnSubmit(SubmittedWeatherForm()),
        ],
        [
          label([For('location'), Class('sr-only')], ['Location']),
          input([
            Id('location'),
            Class(
              'w-full px-4 py-2 rounded-lg border-2 border-blue-300 focus:border-blue-500 outline-none',
            ),
            Placeholder('Enter a zip code'),
            OnInput((value) => UpdatedZipCodeInput({ value })),
          ]),
          button(
            [
              Type('submit'),
              Disabled(model.weather._tag === 'WeatherLoading'),
              Class(
                'px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50',
              ),
            ],
            [
              model.weather._tag === 'WeatherLoading'
                ? 'Loading...'
                : 'Get Weather',
            ],
          ),
        ],
      ),

      M.value(model.weather).pipe(
        M.tagsExhaustive({
          WeatherInit: () => empty,
          WeatherLoading: () =>
            div(
              [Class('text-blue-600 font-semibold')],
              ['Fetching weather...'],
            ),
          WeatherFailure: ({ error }) =>
            div(
              [
                Class(
                  'p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg',
                ),
              ],
              [error],
            ),
          WeatherSuccess: ({ data: weather }) => weatherView(weather),
        }),
      ),
    ],
  )

const weatherView = (weather: WeatherData): Html =>
  article(
    [Class('bg-white rounded-xl shadow-lg p-8 max-w-md w-full')],
    [
      h2(
        [Class('text-2xl font-bold text-gray-800 mb-3 text-center')],
        [weather.zipCode],
      ),
      p(
        [Class('text-center text-gray-600 mb-6')],
        [weather.areaName + ', ' + weather.region],
      ),

      div(
        [Class('text-center mb-6')],
        [
          div(
            [Class('text-6xl font-bold text-blue-600')],
            [`${weather.temperature}°F`],
          ),
          div([Class('text-xl text-gray-600 mt-2')], [weather.description]),
        ],
      ),

      div(
        [Class('grid grid-cols-2 gap-4 text-center')],
        [
          div(
            [Class('bg-blue-50 p-4 rounded-lg')],
            [
              div([Class('text-sm text-gray-600')], ['Humidity']),
              div([Class('text-lg font-semibold')], [`${weather.humidity}%`]),
            ],
          ),
          div(
            [Class('bg-blue-50 p-4 rounded-lg')],
            [
              div([Class('text-sm text-gray-600')], ['Wind Speed']),
              div(
                [Class('text-lg font-semibold')],
                [`${weather.windSpeed} km/h`],
              ),
            ],
          ),
        ],
      ),
    ],
  )

// RUN

const element = Runtime.makeElement({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root')!,
})

Runtime.run(element)
