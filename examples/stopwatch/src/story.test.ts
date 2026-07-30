import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import {
  ClickedReset,
  ClickedStart,
  ClickedStop,
  CompletedDetermineStartTime,
  CompletedDetermineTickTime,
  DetermineStartTime,
  DetermineTickTime,
  type Model,
  Ticked,
  update,
} from './main'

const idleModel: Model = {
  elapsedMs: 0,
  isRunning: false,
  startTime: 0,
}

const runningModel: Model = {
  elapsedMs: 5000,
  isRunning: true,
  startTime: 1000,
}

describe('update', () => {
  describe('start', () => {
    test('ClickedStart fires DetermineStartTime with current elapsed time', () => {
      story(
        update,
        given({ ...idleModel, elapsedMs: 2000 }),
        message(ClickedStart()),
        Command.expectHas(DetermineStartTime),
        model(model => {
          expect(model.isRunning).toBe(false)
        }),
        Command.resolve(
          DetermineStartTime,
          CompletedDetermineStartTime({ startTime: 500 }),
        ),
        model(model => {
          expect(model.isRunning).toBe(true)
          expect(model.startTime).toBe(500)
        }),
      )
    })

    test('CompletedDetermineStartTime stores the offset start time and starts running', () => {
      story(
        update,
        given(idleModel),
        message(CompletedDetermineStartTime({ startTime: 1000 })),
        model(model => {
          expect(model.isRunning).toBe(true)
          expect(model.startTime).toBe(1000)
        }),
      )
    })
  })

  describe('stop and reset', () => {
    test('ClickedStop pauses the stopwatch without zeroing time', () => {
      story(
        update,
        given(runningModel),
        message(ClickedStop()),
        model(model => {
          expect(model.isRunning).toBe(false)
          expect(model.elapsedMs).toBe(5000)
          expect(model.startTime).toBe(1000)
        }),
      )
    })

    test('ClickedReset zeros elapsedMs, isRunning, and startTime', () => {
      story(
        update,
        given(runningModel),
        message(ClickedReset()),
        model(model => {
          expect(model.elapsedMs).toBe(0)
          expect(model.isRunning).toBe(false)
          expect(model.startTime).toBe(0)
        }),
      )
    })

    test('ClickedReset on an idle stopwatch is a no-op', () => {
      story(
        update,
        given(idleModel),
        message(ClickedReset()),
        model(model => {
          expect(model).toEqual(idleModel)
        }),
      )
    })
  })

  describe('ticking', () => {
    test('Ticked fires DetermineTickTime with the stored startTime', () => {
      story(
        update,
        given(runningModel),
        message(Ticked()),
        Command.expectHas(DetermineTickTime),
        Command.resolve(
          DetermineTickTime,
          CompletedDetermineTickTime({ elapsedMs: 6000 }),
        ),
        model(model => {
          expect(model.elapsedMs).toBe(6000)
        }),
      )
    })

    test('CompletedDetermineTickTime stores the new elapsed time', () => {
      story(
        update,
        given(runningModel),
        message(CompletedDetermineTickTime({ elapsedMs: 7500 })),
        model(model => {
          expect(model.elapsedMs).toBe(7500)
        }),
      )
    })
  })
})
