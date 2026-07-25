import { Array } from 'effect'
import { Scene } from 'foldkit'
import { describe, test } from 'vitest'

import {
  CompletedScrollDemoHighlight,
  DelayAdvancePhase,
  ProgressedDemoPhase,
  ScrollDemoHighlight,
  init,
  update,
  view,
} from './asyncCounterDemo'

const [initialModel] = init()

// NOTE: every phase change also scrolls the highlighted lines into view, so
// each step settles that Command alongside the one driving the animation.
const advancePhases = (steps: number, generation: number) =>
  Array.makeBy(steps, () => [
    Scene.Command.resolve(ScrollDemoHighlight, CompletedScrollDemoHighlight()),
    Scene.Command.resolve(
      DelayAdvancePhase,
      ProgressedDemoPhase({ generation }),
    ),
  ]).flat()

describe('async counter demo view', () => {
  test('Add 1 renders the new count', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.text('0')).toExist(),
      Scene.click(Scene.role('button', { name: 'Add 1' })),
      Scene.expect(Scene.text('1')).toExist(),
      ...advancePhases(3, 1),
      Scene.expect(Scene.text('1')).toExist(),
    )
  })

  test('the reset button reports the delay and disables while resetting', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(
        Scene.role('button', { name: 'Reset after 2 seconds' }),
      ).toExist(),
      Scene.click(Scene.role('button', { name: 'Reset after 2 seconds' })),
      Scene.expect(Scene.role('button', { name: 'Resetting...' })).toExist(),
      ...advancePhases(6, 1),
      Scene.expect(
        Scene.role('button', { name: 'Reset after 2 seconds' }),
      ).toExist(),
    )
  })

  test('a reset renders its way back to zero', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.click(Scene.role('button', { name: 'Add 1' })),
      ...advancePhases(3, 1),
      Scene.expect(Scene.text('1')).toExist(),
      Scene.click(Scene.role('button', { name: 'Reset after 2 seconds' })),
      ...advancePhases(6, 2),
      Scene.expect(Scene.text('0')).toExist(),
    )
  })

  test('Add 1 and the stepper are disabled while a reset is in flight', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(
        Scene.role('button', { name: 'Add 1', disabled: false }),
      ).toExist(),
      Scene.click(Scene.role('button', { name: 'Reset after 2 seconds' })),
      Scene.expect(
        Scene.role('button', { name: 'Add 1', disabled: true }),
      ).toExist(),
      Scene.expect(
        Scene.role('button', { name: 'Increase reset delay', disabled: true }),
      ).toExist(),
      Scene.expect(
        Scene.role('button', { name: 'Decrease reset delay', disabled: true }),
      ).toExist(),
      ...advancePhases(6, 1),
      Scene.expect(
        Scene.role('button', { name: 'Add 1', disabled: false }),
      ).toExist(),
      Scene.expect(
        Scene.role('button', { name: 'Increase reset delay', disabled: false }),
      ).toExist(),
    )
  })

  test('the stepper raises the delay the reset button reports', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.click(Scene.role('button', { name: 'Increase reset delay' })),
      Scene.expect(
        Scene.role('button', { name: 'Reset after 3 seconds' }),
      ).toExist(),
      ...advancePhases(3, 1),
      Scene.click(Scene.role('button', { name: 'Decrease reset delay' })),
      Scene.expect(
        Scene.role('button', { name: 'Reset after 2 seconds' }),
      ).toExist(),
      ...advancePhases(3, 2),
    )
  })

  test('the stepper stops at the low end of the allowed range', () => {
    Scene.scene(
      { update, view },
      Scene.with({ ...initialModel, resetDuration: 1 }),
      Scene.expect(
        Scene.role('button', { name: 'Decrease reset delay', disabled: true }),
      ).toExist(),
      Scene.expect(
        Scene.role('button', { name: 'Reset after 1 second' }),
      ).toExist(),
      Scene.click(Scene.role('button', { name: 'Increase reset delay' })),
      Scene.expect(
        Scene.role('button', { name: 'Reset after 2 seconds' }),
      ).toExist(),
      Scene.expect(
        Scene.role('button', { name: 'Decrease reset delay', disabled: false }),
      ).toExist(),
      ...advancePhases(3, 1),
    )
  })

  test('the stepper stops at the high end of the allowed range', () => {
    Scene.scene(
      { update, view },
      Scene.with({ ...initialModel, resetDuration: 5 }),
      Scene.expect(
        Scene.role('button', { name: 'Increase reset delay', disabled: true }),
      ).toExist(),
      Scene.expect(
        Scene.role('button', { name: 'Reset after 5 seconds' }),
      ).toExist(),
      Scene.click(Scene.role('button', { name: 'Decrease reset delay' })),
      Scene.expect(
        Scene.role('button', { name: 'Reset after 4 seconds' }),
      ).toExist(),
      Scene.expect(
        Scene.role('button', { name: 'Increase reset delay', disabled: false }),
      ).toExist(),
      ...advancePhases(3, 1),
    )
  })

  test('the delay is shown as text, not an editable field', () => {
    Scene.scene(
      { update, view },
      Scene.with({ ...initialModel, resetDuration: 4 }),
      Scene.expect(Scene.role('spinbutton')).not.toExist(),
      Scene.expect(Scene.role('textbox')).not.toExist(),
      Scene.expect(
        Scene.role('group', { name: 'Reset Delay (seconds)' }),
      ).toExist(),
      Scene.expect(Scene.text('4')).toExist(),
    )
  })
})
