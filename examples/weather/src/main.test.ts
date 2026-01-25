import { HttpClient, HttpClientResponse } from '@effect/platform'
import { Effect, Layer } from 'effect'
import { expect, test } from 'vitest'

import {
  FetchWeather,
  Model,
  WeatherData,
  WeatherFetched,
  WeatherInit,
  fetchWeather,
  update,
} from './main'

const createModel = (): Model => ({
  zipCodeInput: '90210',
  weather: WeatherInit.make(),
})

test('FetchWeather sets loading state and returns fetch command', () => {
  const model = createModel()

  const [newModel, commands] = update(model, FetchWeather.make())

  expect(newModel.weather._tag).toBe('WeatherLoading')
  expect(commands).toHaveLength(1)
})

test('WeatherFetched updates model with weather data', () => {
  const model = createModel()
  const weatherData: WeatherData = {
    zipCode: '90210',
    temperature: 72,
    description: 'Sunny',
    humidity: 45,
    windSpeed: 10,
    areaName: 'Beverly Hills',
    region: 'California',
  }

  const [newModel, commands] = update(model, WeatherFetched.make({ weather: weatherData }))

  expect(newModel.weather._tag).toBe('WeatherSuccess')
  if (newModel.weather._tag === 'WeatherSuccess') {
    expect(newModel.weather.data.temperature).toBe(72)
    expect(newModel.weather.data.areaName).toBe('Beverly Hills')
  }
  expect(commands).toHaveLength(0)
})

test('fetchWeather returns WeatherFetched with data on success', async () => {
  const mockResponseData = {
    current_condition: [
      {
        temp_F: '72',
        humidity: '45',
        windspeedKmph: '10',
        weatherDesc: [{ value: 'Sunny' }],
      },
    ],
    nearest_area: [
      {
        areaName: [{ value: 'Beverly Hills' }],
        region: [{ value: 'California' }],
      },
    ],
  }

  const mockClient = HttpClient.make((req) =>
    Effect.succeed(
      HttpClientResponse.fromWeb(
        req,
        new Response(JSON.stringify(mockResponseData), { status: 200 }),
      ),
    ),
  )

  const HttpClientTest = Layer.succeed(HttpClient.HttpClient, mockClient)

  const message = await fetchWeather('90210').pipe(
    Effect.provide(HttpClientTest),
    Effect.runPromise,
  )

  expect(message._tag).toBe('WeatherFetched')
  if (message._tag === 'WeatherFetched') {
    expect(message.weather.temperature).toBe(72)
    expect(message.weather.areaName).toBe('Beverly Hills')
  }
})

test('fetchWeather returns WeatherError on HTTP failure', async () => {
  const mockClient = HttpClient.make((req) =>
    Effect.succeed(HttpClientResponse.fromWeb(req, new Response(null, { status: 404 }))),
  )

  const HttpClientTest = Layer.succeed(HttpClient.HttpClient, mockClient)

  const message = await fetchWeather('invalid').pipe(
    Effect.provide(HttpClientTest),
    Effect.runPromise,
  )

  expect(message._tag).toBe('WeatherError')
})
