import { Array, Duration, pipe } from 'effect'
import { describe, expect, test } from 'vitest'

import {
  ChangedDemoResetDuration,
  ClickedDemoIncrement,
  ClickedDemoReset,
  CompletedDelayAdvancePhase,
  type Message,
  type Model,
  init,
  update,
} from './asyncCounterDemo'

const [initialModel] = init()

const RESET_PHASE_STEPS = 6
const INCREMENT_PHASE_STEPS = 3
const DURATION_PHASE_STEPS = 3

// NOTE: the runtime drives the phase machine with delayed Commands. update is
// pure, so sending the Messages those Commands produce walks the same chain
// with no waiting.
const send = (model: Model, messages: ReadonlyArray<Message>): Model =>
  Array.reduce(messages, model, (current, message) => {
    const [nextModel] = update(current, message)
    return nextModel
  })

const advancePhases = (model: Model, steps: number): Model =>
  send(
    model,
    Array.makeBy(steps, () =>
      CompletedDelayAdvancePhase({ generation: model.generation }),
    ),
  )

describe('async counter demo', () => {
  test('Add 1 runs the increment animation and keeps the count', () => {
    const [incremented, commands] = update(initialModel, ClickedDemoIncrement())
    expect(incremented.count).toBe(1)
    expect(incremented.phase).toBe('IncrementMessage')
    expect(incremented.generation).toBe(1)
    expect(Array.map(commands, command => command.name)).toStrictEqual([
      'DelayAdvancePhase',
    ])

    const settled = advancePhases(incremented, INCREMENT_PHASE_STEPS)
    expect(settled.phase).toBe('Idle')
    expect(settled.count).toBe(1)
  })

  test('a reset holds isResetting until the delay lands, then zeroes', () => {
    const resetting = send(initialModel, [
      ClickedDemoIncrement(),
      ...Array.makeBy(INCREMENT_PHASE_STEPS, () =>
        CompletedDelayAdvancePhase({ generation: 1 }),
      ),
      ClickedDemoReset(),
    ])
    expect(resetting.count).toBe(1)
    expect(resetting.isResetting).toBe(true)

    const settled = advancePhases(resetting, RESET_PHASE_STEPS)
    expect(settled.count).toBe(0)
    expect(settled.isResetting).toBe(false)
    expect(settled.phase).toBe('Idle')
    expect(settled.messageLog).toContain('CompletedDelayReset')
  })

  test('changing the delay runs its own Message animation', () => {
    const changed = send(initialModel, [
      ChangedDemoResetDuration({ seconds: 4 }),
    ])
    expect(changed.resetDuration).toBe(4)
    expect(changed.phase).toBe('DurationMessage')
    expect(changed.messageLog).toContain('ChangedResetDuration({ seconds: 4 })')

    const settled = advancePhases(changed, DURATION_PHASE_STEPS)
    expect(settled.phase).toBe('Idle')
    expect(settled.resetDuration).toBe(4)
  })

  test('an out of range delay is clamped before it reaches the Model', () => {
    const tooLow = send(initialModel, [
      ChangedDemoResetDuration({ seconds: 0 }),
    ])
    expect(tooLow.resetDuration).toBe(1)

    const tooHigh = send(initialModel, [
      ChangedDemoResetDuration({ seconds: 99 }),
    ])
    expect(tooHigh.resetDuration).toBe(5)
  })

  test('the reset Command waits the delay the Model reports', () => {
    const resetting = send(initialModel, [
      ChangedDemoResetDuration({ seconds: 0 }),
      ClickedDemoReset(),
    ])
    expect(resetting.resetDuration).toBe(1)
    const atUpdate = send(resetting, [
      CompletedDelayAdvancePhase({ generation: resetting.generation }),
    ])
    const [atCommand, commands] = update(
      atUpdate,
      CompletedDelayAdvancePhase({ generation: resetting.generation }),
    )

    expect(atCommand.phase).toBe('ResetCommand')
    expect(
      pipe(
        commands,
        Array.map(command => command.args?.['duration']),
        Array.filter(Duration.isDuration),
        Array.map(Duration.toMillis),
      ),
    ).toStrictEqual([1000])
  })

  test('a stale phase Message from a superseded interaction is ignored', () => {
    const resetting = send(initialModel, [
      ClickedDemoIncrement(),
      ClickedDemoReset(),
    ])
    expect(resetting.phase).toBe('ResetMessage')
    expect(resetting.generation).toBe(2)

    const stale = send(resetting, [
      CompletedDelayAdvancePhase({ generation: 1 }),
    ])
    expect(stale.phase).toBe('ResetMessage')
  })
})
