import { Effect, Option, Schema as S, Stream } from 'effect'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import { defineMessageUnion } from '../message/index.js'
import * as Mount from './index.js'

const Message = defineMessageUnion({
  CompletedMeasurePanel: { panelId: S.String, width: S.Number },
  ScrolledPanel: { scroll: S.Number },
})

const PANEL_WIDTH = 320

const panelElement = (): Element => {
  const element = document.createElement('div')
  element.setAttribute('data-width', String(PANEL_WIDTH))
  return element
}

const measuredWidth = (element: Element): number =>
  Number(element.getAttribute('data-width'))

// NOTE: `if (false)` keeps this out of the run. The check is the
// `@ts-expect-error` below: `pnpm typecheck` fails if declaring an args field
// named `element` ever stops being an error at the definition site.
if (false) {
  Mount.define('MeasurePanel', {
    args: {
      // @ts-expect-error `element` names the live element execute receives, so an arg cannot claim it
      element: S.String,
      panelId: S.String,
    },
    messages: [Message.CompletedMeasurePanel],
    execute: ({ element, panelId }) =>
      Effect.succeed(
        Message.CompletedMeasurePanel({
          panelId,
          width: measuredWidth(element),
        }),
      ),
  })
}

describe('Mount.define defers its execute body', () => {
  it.effect('does not run execute until the element mounts', () =>
    Effect.gen(function* () {
      let bodyRunCount = 0

      const MeasurePanel = Mount.define('MeasurePanel', {
        args: { panelId: S.String },
        messages: [Message.CompletedMeasurePanel],
        execute: ({ element, panelId }) => {
          bodyRunCount = bodyRunCount + 1
          return Effect.succeed(
            Message.CompletedMeasurePanel({
              panelId,
              width: measuredWidth(element),
            }),
          )
        },
      })

      const action = MeasurePanel({ panelId: 'panel' })
      expect(bodyRunCount).toBe(0)

      const maybeMessage = yield* Stream.runHead(action.f(panelElement()))

      expect(bodyRunCount).toBe(1)
      expect(maybeMessage).toStrictEqual(
        Option.some(
          Message.CompletedMeasurePanel({
            panelId: 'panel',
            width: PANEL_WIDTH,
          }),
        ),
      )
    }),
  )

  it('never runs execute for a MountAction a view constructs and discards', () => {
    let bodyRunCount = 0

    const MeasurePanel = Mount.define('MeasurePanel', {
      args: { panelId: S.String },
      messages: [Message.CompletedMeasurePanel],
      execute: ({ element, panelId }) => {
        bodyRunCount = bodyRunCount + 1
        return Effect.succeed(
          Message.CompletedMeasurePanel({
            panelId,
            width: measuredWidth(element),
          }),
        )
      },
    })

    MeasurePanel({ panelId: 'discarded' })

    expect(bodyRunCount).toBe(0)
  })

  it('does not run a no-args execute when the action is constructed', () => {
    let bodyRunCount = 0

    const MeasurePanel = Mount.define('MeasurePanel', {
      messages: [Message.CompletedMeasurePanel],
      execute: ({ element }) => {
        bodyRunCount = bodyRunCount + 1
        return Effect.succeed(
          Message.CompletedMeasurePanel({
            panelId: 'panel',
            width: measuredWidth(element),
          }),
        )
      },
    })

    MeasurePanel()

    expect(bodyRunCount).toBe(0)
  })
})

describe('Mount.defineStream defers its execute body', () => {
  it.effect('does not run execute until the element mounts', () =>
    Effect.gen(function* () {
      let bodyRunCount = 0

      const WatchPanelScroll = Mount.defineStream('WatchPanelScroll', {
        args: { initialScroll: S.Number },
        messages: [Message.ScrolledPanel],
        execute: ({ element, initialScroll }) => {
          bodyRunCount = bodyRunCount + 1
          return Stream.make(
            Message.ScrolledPanel({
              scroll: initialScroll + measuredWidth(element),
            }),
          )
        },
      })

      const action = WatchPanelScroll({ initialScroll: 8 })
      expect(bodyRunCount).toBe(0)

      const maybeMessage = yield* Stream.runHead(action.f(panelElement()))

      expect(bodyRunCount).toBe(1)
      expect(maybeMessage).toStrictEqual(
        Option.some(Message.ScrolledPanel({ scroll: 8 + PANEL_WIDTH })),
      )
    }),
  )

  it('never runs execute for a MountAction a view constructs and discards', () => {
    let bodyRunCount = 0

    const WatchPanelScroll = Mount.defineStream('WatchPanelScroll', {
      messages: [Message.ScrolledPanel],
      execute: ({ element }) => {
        bodyRunCount = bodyRunCount + 1
        return Stream.make(
          Message.ScrolledPanel({ scroll: measuredWidth(element) }),
        )
      },
    })

    WatchPanelScroll()

    expect(bodyRunCount).toBe(0)
  })
})
