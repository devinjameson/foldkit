import { Array, Effect, Match, Schema as S, String } from 'effect'

import { Fold, Runtime } from '@foldkit'
import {
  Class,
  Disabled,
  For,
  Html,
  Id,
  OnChange,
  OnSubmit,
  Placeholder,
  Type,
  button,
  div,
  empty,
  form,
  h1,
  h2,
  input,
  label,
  p,
} from '@foldkit/html'
import { ST, ts } from '@foldkit/schema'

// MODEL

const WeatherData = S.Struct({
  zipCode: S.String,
  temperature: S.Number,
  description: S.String,
  humidity: S.Number,
  windSpeed: S.Number,
  areaName: S.String,
  region: S.String,
})
type WeatherData = ST<typeof WeatherData>

const WeatherInit = ts('WeatherInit')
const WeatherLoading = ts('WeatherLoading')
const WeatherSuccess = ts('WeatherSuccess', { data: WeatherData })
const WeatherFailure = ts('WeatherFailure', { error: S.String })

const WeatherAsyncResult = S.Union(WeatherInit, WeatherLoading, WeatherSuccess, WeatherFailure)

type WeatherInit = ST<typeof WeatherInit>
type WeatherLoading = ST<typeof WeatherLoading>
type WeatherSuccess = ST<typeof WeatherSuccess>
type WeatherFailure = ST<typeof WeatherFailure>

type WeatherAsyncResult = ST<typeof WeatherAsyncResult>

const Model = S.Struct({
  zipCodeInput: S.String,
  weather: WeatherAsyncResult,
})
type Model = ST<typeof Model>

// MESSAGE

const UpdateZipCodeInput = ts('UpdateZipCodeInput', { value: S.String })
const FetchWeather = ts('FetchWeather')
const WeatherFetched = ts('WeatherFetched', { weather: WeatherData })
const WeatherError = ts('WeatherError', { error: S.String })

const Message = S.Union(UpdateZipCodeInput, FetchWeather, WeatherFetched, WeatherError)

type UpdateZipCodeInput = ST<typeof UpdateZipCodeInput>
type FetchWeather = ST<typeof FetchWeather>
type WeatherFetched = ST<typeof WeatherFetched>
type WeatherError = ST<typeof WeatherError>

type Message = ST<typeof Message>

const update = Fold.fold<Model, Message>({
  UpdateZipCodeInput: (model, { value }) => [{ ...model, zipCodeInput: value }, []],

  FetchWeather: (model) => [
    { ...model, weather: WeatherLoading.make() },
    [fetchWeatherCommand(model.zipCodeInput)],
  ],

  WeatherFetched: (model, { weather }) => [
    { ...model, weather: WeatherSuccess.make({ data: weather }) },
    [],
  ],

  WeatherError: (model, { error }) => [{ ...model, weather: WeatherFailure.make({ error }) }, []],
})

// INIT

const init: Runtime.ElementInit<Model, Message> = () => [
  {
    zipCodeInput: '',
    weather: WeatherInit.make(),
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

const fetchWeatherCommand = (zipCode: string): Runtime.Command<WeatherFetched | WeatherError> =>
  Effect.gen(function* () {
    if (String.isEmpty(zipCode.trim())) {
      return WeatherError.make({ error: 'Zip code required' })
    }

    const response = yield* Effect.tryPromise(() =>
      fetch(`https://wttr.in/${encodeURIComponent(zipCode)},US?format=j1`),
    )

    if (!response.ok) {
      return WeatherError.make({ error: 'Location not found' })
    }

    const data: WeatherResponseData = yield* Effect.tryPromise(() => response.json())
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

    return WeatherFetched.make({ weather })
  }).pipe(
    Effect.catchAll(() =>
      Effect.succeed(WeatherError.make({ error: 'Failed to fetch weather data' })),
    ),
  )

// VIEW

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
        [Class('flex flex-col gap-4 items-center w-full max-w-md'), OnSubmit(FetchWeather.make())],
        [
          label([For('location'), Class('sr-only')], ['Location']),
          input([
            Id('location'),
            Class(
              'w-full px-4 py-2 rounded-lg border-2 border-blue-300 focus:border-blue-500 outline-none',
            ),
            Placeholder('Enter a zip code'),
            OnChange((value) => UpdateZipCodeInput.make({ value })),
          ]),
          button(
            [
              Type('submit'),
              Disabled(model.weather._tag === 'WeatherLoading'),
              Class(
                'px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50',
              ),
            ],
            [model.weather._tag === 'WeatherLoading' ? 'Loading...' : 'Get Weather'],
          ),
        ],
      ),

      Match.value(model.weather).pipe(
        Match.tagsExhaustive({
          WeatherInit: () => empty,
          WeatherLoading: () =>
            div([Class('text-blue-600 font-semibold')], ['Fetching weather...']),
          WeatherFailure: ({ error }) =>
            div([Class('p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg')], [error]),
          WeatherSuccess: ({ data: weather }) => weatherView(weather),
        }),
      ),
    ],
  )

const weatherView = (weather: WeatherData): Html =>
  div(
    [Class('bg-white rounded-xl shadow-lg p-8 max-w-md w-full')],
    [
      h2([Class('text-2xl font-bold text-gray-800 mb-3 text-center')], [weather.zipCode]),
      p([Class('text-center text-gray-600 mb-6')], [weather.areaName + ', ' + weather.region]),

      div(
        [Class('text-center mb-6')],
        [
          div([Class('text-6xl font-bold text-blue-600')], [`${weather.temperature}°F`]),
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
              div([Class('text-lg font-semibold')], [`${weather.windSpeed} km/h`]),
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

Effect.runFork(element)
