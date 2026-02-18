import { HttpClient, HttpClientResponse } from '@effect/platform'
import { Effect, Layer } from 'effect'
import { expect, test } from 'vitest'

import { FetchWeather, fetchWeather, update } from './main'

test('FetchWeather sets loading state and returns fetch command', () => {
  const model = createModel()

  const [newModel, commands] = update(model, FetchWeather())

  expect(newModel.weather._tag).toBe('WeatherLoading')
  expect(commands).toHaveLength(1)
})

test('fetchWeather returns WeatherFetched with data on success', async () => {
  const mockResponse = {
    current_condition: [
      { temp_F: '72', weatherDesc: [{ value: 'Sunny' }] },
    ],
    nearest_area: [{ areaName: [{ value: 'Beverly Hills' }] }],
  }

  // Provide a mock HttpClient - no msw or fetch mocking needed
  const mockClient = HttpClient.make((req) =>
    Effect.succeed(
      HttpClientResponse.fromWeb(
        req,
        new Response(JSON.stringify(mockResponse), { status: 200 }),
      ),
    ),
  )

  const message = await fetchWeather('90210').pipe(
    Effect.provide(Layer.succeed(HttpClient.HttpClient, mockClient)),
    Effect.runPromise,
  )

  expect(message._tag).toBe('WeatherFetched')
})
