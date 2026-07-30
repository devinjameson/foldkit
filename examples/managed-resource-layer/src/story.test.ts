import { Option } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import {
  ClickedCompute,
  ClickedStartEngine,
  ClickedStopEngine,
  CompletedCompute,
  Compute,
  EngineBooting,
  EngineFailed,
  EngineOff,
  EngineReady,
  FailedStartEngine,
  type Model,
  SkippedCompute,
  StartedEngine,
  StoppedEngine,
  update,
} from './main'

const offModel: Model = {
  engine: EngineOff(),
  computeCount: 0,
  maybeSquareResult: Option.none(),
}

const readyModel: Model = {
  engine: EngineReady({ engineId: 'engine-1' }),
  computeCount: 2,
  maybeSquareResult: Option.none(),
}

describe('update', () => {
  describe('engine lifecycle', () => {
    test('ClickedStartEngine requests the engine by entering EngineBooting', () => {
      story(
        update,
        given(offModel),
        message(ClickedStartEngine()),
        model(model => {
          expect(model.engine._tag).toBe('EngineBooting')
        }),
      )
    })

    test('StartedEngine marks the engine ready with its id', () => {
      story(
        update,
        given({ ...offModel, engine: EngineBooting() }),
        message(StartedEngine({ engineId: 'engine-7' })),
        model(model => {
          expect(model.engine).toStrictEqual(
            EngineReady({ engineId: 'engine-7' }),
          )
        }),
      )
    })

    test('ClickedStopEngine releases the engine by entering EngineOff', () => {
      story(
        update,
        given(readyModel),
        message(ClickedStopEngine()),
        model(model => {
          expect(model.engine._tag).toBe('EngineOff')
        }),
      )
    })

    test('StoppedEngine is a no-op lifecycle ack', () => {
      story(
        update,
        given(offModel),
        message(StoppedEngine()),
        model(model => {
          expect(model).toStrictEqual(offModel)
        }),
      )
    })

    test('FailedStartEngine records the failure reason', () => {
      story(
        update,
        given({ ...offModel, engine: EngineBooting() }),
        message(FailedStartEngine({ reason: 'boot timeout' })),
        model(model => {
          expect(model.engine).toStrictEqual(
            EngineFailed({ reason: 'boot timeout' }),
          )
        }),
      )
    })
  })

  describe('compute', () => {
    test('ClickedCompute increments the counter and fires Compute with the next value', () => {
      story(
        update,
        given(readyModel),
        message(ClickedCompute()),
        model(model => {
          expect(model.computeCount).toBe(3)
        }),
        Command.expectExact(Compute({ value: 3 })),
        Command.resolve(Compute, CompletedCompute({ result: 9 })),
        model(model => {
          expect(model.maybeSquareResult).toStrictEqual(Option.some(9))
        }),
      )
    })

    test('SkippedCompute leaves the model unchanged', () => {
      story(
        update,
        given(readyModel),
        message(SkippedCompute()),
        model(model => {
          expect(model).toStrictEqual(readyModel)
        }),
      )
    })
  })
})
