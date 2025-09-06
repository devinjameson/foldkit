import { Array, Data, Effect, Option, String } from 'effect'
import { Fold, Runtime } from '@foldkit'
import {
  Class,
  Html,
  OnChange,
  OnSubmit,
  Placeholder,
  Id,
  For,
  Type,
  Disabled,
  empty,
  button,
  div,
  input,
  h1,
  h2,
  form,
  label,
  p,
} from '@foldkit/html'

// MODEL

type WeatherData = {
  zipCode: string
  temperature: number
  description: string
  humidity: number
  windSpeed: number
  areaName: string
  region: string
}

type WeatherAsyncResult = Data.TaggedEnum<{
  Init: {}
  Loading: {}
  Success: { data: WeatherData }
  Failure: { error: string }
}>

const WeatherAsyncResult = Data.taggedEnum<WeatherAsyncResult>()

type Model = Readonly<{
  zipCodeInput: string
  weather: WeatherAsyncResult
}>

// UPDATE

type Message = Data.TaggedEnum<{
  UpdateZipCodeInput: { value: string }
  FetchWeather: {}
  WeatherFetched: { weather: WeatherData }
  WeatherError: { error: string }
}>
const Message = Data.taggedEnum<Message>()

const { pure, pureCommand } = Fold.updateConstructors<Model, Message>()

const update = Fold.fold<Model, Message>({
  UpdateZipCodeInput: pure((model, { value }) => ({
    ...model,
    zipCodeInput: value,
  })),
  FetchWeather: pureCommand((model) => [
    {
      ...model,
      weather: WeatherAsyncResult.Loading(),
    },
    fetchWeatherCommand(model.zipCodeInput),
  ]),
  WeatherFetched: pure((model, { weather }) => ({
    ...model,
    weather: WeatherAsyncResult.Success({ data: weather }),
  })),
  WeatherError: pure((model, { error }) => ({
    ...model,
    weather: WeatherAsyncResult.Failure({ error }),
  })),
})

// INIT

const init: Runtime.ElementInit<Model, Message> = () => [
  {
    zipCodeInput: '',
    weather: WeatherAsyncResult.Init(),
  },
  Option.none(),
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

const fetchWeatherCommand = (zipCode: string): Runtime.Command<Message> =>
  Effect.gen(function* () {
    if (String.isEmpty(zipCode.trim())) {
      return Message.WeatherError({ error: 'Zip code required' })
    }

    const response = yield* Effect.tryPromise(() =>
      fetch(`https://wttr.in/${encodeURIComponent(zipCode)},US?format=j1`),
    )

    if (!response.ok) {
      return Message.WeatherError({ error: 'Location not found' })
    }

    const data: WeatherResponseData = yield* Effect.tryPromise(() => response.json())
    const currentCondition = data.current_condition[0]
    const areaName = data.nearest_area[0].areaName[0].value
    const region = data.nearest_area[0].region[0].value

    const weather: WeatherData = {
      zipCode,
      temperature: parseInt(currentCondition.temp_F),
      description: currentCondition.weatherDesc[0].value,
      humidity: parseInt(currentCondition.humidity),
      windSpeed: parseFloat(currentCondition.windspeedKmph),
      areaName,
      region,
    }

    return Message.WeatherFetched({ weather })
  }).pipe(
    Effect.catchAll(() =>
      Effect.succeed(Message.WeatherError({ error: 'Failed to fetch weather data' })),
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
        [
          Class('flex flex-col gap-4 items-center w-full max-w-md'),
          OnSubmit(Message.FetchWeather()),
        ],
        [
          label([For('location'), Class('sr-only')], ['Location']),
          input([
            Id('location'),
            Class(
              'w-full px-4 py-2 rounded-lg border-2 border-blue-300 focus:border-blue-500 outline-none',
            ),
            Placeholder('Enter a zip code'),
            OnChange((value) => Message.UpdateZipCodeInput({ value })),
          ]),
          button(
            [
              Type('submit'),
              Disabled(WeatherAsyncResult.$is('Loading')(model.weather)),
              Class(
                'px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50',
              ),
            ],
            [WeatherAsyncResult.$is('Loading')(model.weather) ? 'Loading...' : 'Get Weather'],
          ),
        ],
      ),

      WeatherAsyncResult.$match(model.weather, {
        Init: () => empty,
        Loading: () => div([Class('text-blue-600 font-semibold')], ['Fetching weather...']),
        Failure: ({ error }) =>
          div([Class('p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg')], [error]),
        Success: ({ data: weather }) => weatherView(weather),
      }),
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

const app = Runtime.makeElement({
  init,
  update,
  view,
  container: document.body,
})

Effect.runFork(app)
