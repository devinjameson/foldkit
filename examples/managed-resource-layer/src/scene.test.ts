import { Option } from 'effect'
import { Scene } from 'foldkit'
import { describe, test } from 'vitest'

import {
  Compute,
  ComputedSquare,
  EngineOff,
  EngineReady,
  Model,
  managedResources,
  update,
  view,
} from './main'

const offModel = Model.make({
  engine: EngineOff(),
  computeCount: 0,
  maybeSquareResult: Option.none(),
})

const readyModel = Model.make({
  engine: EngineReady({ engineId: 'engine-1' }),
  computeCount: 2,
  maybeSquareResult: Option.none(),
})

describe('view', () => {
  test('initial view shows the engine off with a Start button', () => {
    Scene.scene(
      { update, view },
      Scene.with(offModel),
      Scene.expect(Scene.text('Engine is off.')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Start engine' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Stop engine' })).toBeAbsent(),
      Scene.expect(
        Scene.role('button', { name: 'Compute next square' }),
      ).toBeDisabled(),
      Scene.expect(Scene.text('No result yet.')).toExist(),
    )
  })

  test('clicking Start engine enters the booting state and shows Stop', () => {
    Scene.scene(
      { update, view },
      Scene.with(offModel),
      Scene.click(Scene.role('button', { name: 'Start engine' })),
      Scene.expect(Scene.text('Booting engine...')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Stop engine' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Start engine' })).toBeAbsent(),
    )
  })

  test('a ready engine shows its id and the Stop button', () => {
    Scene.scene(
      { update, view },
      Scene.with(readyModel),
      Scene.expect(Scene.text('Engine ready: engine-1')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Stop engine' })).toExist(),
      Scene.expect(
        Scene.role('button', { name: 'Compute next square' }),
      ).not.toBeDisabled(),
    )
  })

  test('clicking Compute fires the Compute command and renders the result', () => {
    Scene.scene(
      { update, view },
      Scene.with(readyModel),
      Scene.click(Scene.role('button', { name: 'Compute next square' })),
      Scene.Command.expectExact(Compute({ value: 3 })),
      Scene.Command.resolve(Compute, ComputedSquare({ result: 9 })),
      Scene.expect(Scene.text('Square result: 9')).toExist(),
    )
  })

  test('the engine lifecycle drives boot, ready, and stop through the resource steps', () => {
    Scene.scene(
      { update, view },
      Scene.with(offModel),
      Scene.click(Scene.role('button', { name: 'Start engine' })),
      Scene.expect(Scene.text('Booting engine...')).toExist(),
      Scene.ManagedResource.acquire(managedResources.engine, {
        engineId: 'engine-1',
        square: value => value * value,
      }),
      Scene.expect(Scene.text('Engine ready: engine-1')).toExist(),
      Scene.expect(
        Scene.role('button', { name: 'Compute next square' }),
      ).not.toBeDisabled(),
      Scene.click(Scene.role('button', { name: 'Stop engine' })),
      Scene.ManagedResource.release(managedResources.engine),
      Scene.expect(Scene.text('Engine is off.')).toExist(),
    )
  })

  test('a failed engine boot shows the failure reason', () => {
    Scene.scene(
      { update, view },
      Scene.with(offModel),
      Scene.click(Scene.role('button', { name: 'Start engine' })),
      Scene.ManagedResource.failAcquire(
        managedResources.engine,
        'Error: crypto unavailable',
      ),
      Scene.expect(
        Scene.text('Engine failed: Error: crypto unavailable'),
      ).toExist(),
      Scene.expect(Scene.role('button', { name: 'Start engine' })).toExist(),
    )
  })
})
