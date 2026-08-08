import { Context, Option } from 'effect'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { MountTracker } from '../mount/index.js'
import { Dispatch } from '../runtime/index.js'
import { __htmlBuilder } from './index.js'
import {
  type DispatchSync,
  clearRuntime,
  setRuntime,
} from './runtimeSingleton.js'

type Message = Readonly<{ _tag: 'SelectedOption' }>

const h = __htmlBuilder<Message>()

const dispatched: Array<Message> = []

const setUpRuntime = (): void => {
  const dispatchSync: DispatchSync = message => {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    dispatched.push(message as Message)
  }
  const dispatchService = Dispatch.of({
    dispatchAsync: () =>
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      Promise.resolve() as unknown as ReturnType<
        typeof Dispatch.Service.dispatchAsync
      >,
    dispatchSync,
  })
  const context = Context.make(Dispatch, dispatchService).pipe(
    Context.add(MountTracker, {
      started: () => {},
      ended: () => {},
    }),
  )
  setRuntime(dispatchSync, context)
}

const FOCUS_TARGET_ID = 'focus-target'

const renderFocusTarget = (): HTMLElement => {
  const target = document.createElement('button')
  target.id = FOCUS_TARGET_ID
  document.body.appendChild(target)
  return target
}

const keydownHandlerOf = (
  toMaybeFocusSelector: (key: string) => Option.Option<string>,
): ((event: unknown) => void) => {
  const vnode = h.div([h.OnKeyDownFocusOnly(toMaybeFocusSelector)])
  const handler = vnode?.data?.on?.['keydown']
  expect(typeof handler).toBe('function')
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return handler as (event: unknown) => void
}

const toMaybeFocusSelector = (key: string): Option.Option<string> =>
  key === 'ArrowDown' ? Option.some(`#${FOCUS_TARGET_ID}`) : Option.none()

beforeEach(() => {
  dispatched.length = 0
  setUpRuntime()
})

afterEach(() => {
  clearRuntime()
  document.body.innerHTML = ''
})

describe('OnKeyDownFocusOnly', () => {
  it('focuses the selector and dispatches nothing for a handled key', () => {
    const target = renderFocusTarget()
    const keydownHandler = keydownHandlerOf(toMaybeFocusSelector)

    let isDefaultPrevented = false
    keydownHandler({
      key: 'ArrowDown',
      preventDefault: () => {
        isDefaultPrevented = true
      },
    })

    expect(document.activeElement).toBe(target)
    expect(isDefaultPrevented).toBe(true)
    expect(dispatched).toEqual([])
  })

  it('leaves focus and the default intact for an unhandled key', () => {
    renderFocusTarget()
    const keydownHandler = keydownHandlerOf(toMaybeFocusSelector)

    let isDefaultPrevented = false
    keydownHandler({
      key: 'Enter',
      preventDefault: () => {
        isDefaultPrevented = true
      },
    })

    expect(document.activeElement).toBe(document.body)
    expect(isDefaultPrevented).toBe(false)
    expect(dispatched).toEqual([])
  })
})
