import { Effect, Layer, Match as M, String } from 'effect'
import { HttpClient, HttpClientResponse } from 'effect/unstable/http'
import { Command, given, message, model, story } from 'foldkit/story'
import { expect, test } from 'vitest'

import {
  FailedFetchWeather,
  FetchWeather,
  SubmittedWeatherForm,
  SucceededFetchWeather,
  fetchWeatherEffect,
  update,
} from './main'
import {
  mockGeocodingResponse,
  mockWeatherResponse,
  weatherData,
  weatherModel,
} from './main.fixtures'

test('submitting the weather form fetches weather and shows result', () => {
  story(
    update,
    given(weatherModel),
    message(SubmittedWeatherForm()),
    model(model => {
      expect(model.weather._tag).toBe('Loading')
    }),
    Command.resolve(
      FetchWeather,
      SucceededFetchWeather({ weather: weatherData }),
    ),
    model(model => {
      expect(model.weather._tag).toBe('Success')
      if (model.weather._tag === 'Success') {
        expect(model.weather.data.temperature).toBe(72)
        expect(model.weather.data.locationName).toBe('Beverly Hills')
      }
    }),
  )
})

test('failed fetch shows failure state', () => {
  story(
    update,
    given(weatherModel),
    message(SubmittedWeatherForm()),
    Command.resolve(
      FetchWeather,
      FailedFetchWeather({ error: 'Network error' }),
    ),
    model(model => {
      expect(model.weather._tag).toBe('Failure')
      if (model.weather._tag === 'Failure') {
        expect(model.weather.error).toBe('Network error')
      }
    }),
  )
})

test('fetchWeather returns SucceededFetchWeather with data on success', async () => {
  const mockClient = HttpClient.make(request =>
    Effect.sync(() => {
      const responseData = M.value(request.url).pipe(
        M.when(String.includes('geocoding'), () => mockGeocodingResponse),
        M.when(String.includes('forecast'), () => mockWeatherResponse),
        M.orElse(url => {
          throw new Error(`Unexpected request URL: ${url}`)
        }),
      )
      return HttpClientResponse.fromWeb(
        request,
        new Response(JSON.stringify(responseData), { status: 200 }),
      )
    }),
  )

  const HttpClientTest = Layer.succeed(HttpClient.HttpClient, mockClient)

  const resultMessage = await fetchWeatherEffect('90210').pipe(
    Effect.provide(HttpClientTest),
    Effect.runPromise,
  )

  expect(resultMessage._tag).toBe('SucceededFetchWeather')
  if (resultMessage._tag === 'SucceededFetchWeather') {
    expect(resultMessage.weather.temperature).toBe(72)
    expect(resultMessage.weather.locationName).toBe('Beverly Hills')
    expect(resultMessage.weather.description).toBe('Clear sky')
    expect(resultMessage.weather.windSpeed).toBe(10)
  }
})

test('fetchWeather returns FailedFetchWeather on HTTP failure', async () => {
  const mockClient = HttpClient.make(request =>
    Effect.succeed(
      HttpClientResponse.fromWeb(request, new Response(null, { status: 404 })),
    ),
  )

  const HttpClientTest = Layer.succeed(HttpClient.HttpClient, mockClient)

  const resultMessage = await fetchWeatherEffect('invalid').pipe(
    Effect.provide(HttpClientTest),
    Effect.runPromise,
  )

  expect(resultMessage._tag).toBe('FailedFetchWeather')
})

test('fetchWeather returns FailedFetchWeather when no results found', async () => {
  const mockClient = HttpClient.make(request =>
    Effect.succeed(
      HttpClientResponse.fromWeb(
        request,
        new Response(JSON.stringify({ results: [] }), { status: 200 }),
      ),
    ),
  )

  const HttpClientTest = Layer.succeed(HttpClient.HttpClient, mockClient)

  const resultMessage = await fetchWeatherEffect('00000').pipe(
    Effect.provide(HttpClientTest),
    Effect.runPromise,
  )

  expect(resultMessage._tag).toBe('FailedFetchWeather')
  if (resultMessage._tag === 'FailedFetchWeather') {
    expect(resultMessage.error).toBe('Location not found')
  }
})
