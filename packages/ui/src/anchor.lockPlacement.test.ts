import { Array as Array_, Function, Option, pipe } from 'effect'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type {
  ComputePositionConfig,
  Placement as FloatingPlacement,
} from '@floating-ui/dom'

import { type AnchorConfig, anchorSetup } from './anchor.js'

type MockComputePositionReturn = {
  x: number
  y: number
  placement: FloatingPlacement
}

type DeferredPosition = Readonly<{
  promise: Promise<MockComputePositionReturn>
  resolve: (value: MockComputePositionReturn) => void
}>

const deferPosition = (): DeferredPosition => {
  let resolve: (value: MockComputePositionReturn) => void = Function.constVoid
  const promise = new Promise<MockComputePositionReturn>(capture => {
    resolve = capture
  })
  return { promise, resolve }
}

const flushPromises = (): Promise<void> =>
  new Promise(resolve => {
    setTimeout(resolve, 0)
  })

const BUTTON_ID = 'btn'

const computePositionMock =
  vi.fn<
    (
      reference: Element,
      floating: Element,
      options: Partial<ComputePositionConfig>,
    ) => Promise<MockComputePositionReturn>
  >()

const updateCallbacks: Array<() => void> = []

// NOTE: `actual` is spread so the real offset/flip/shift/size factories survive
// and their middleware objects keep the `.name` values the assertions match on.
// Stubbing those factories too would make every name assertion pass vacuously.
// `autoUpdate` invokes its callback once on setup, as the real one does.
vi.mock('@floating-ui/dom', async importOriginal => {
  const actual = await importOriginal<typeof import('@floating-ui/dom')>()
  return {
    ...actual,
    computePosition: (
      reference: Element,
      floating: Element,
      options: Partial<ComputePositionConfig>,
    ) => computePositionMock(reference, floating, options),
    autoUpdate: (
      _reference: unknown,
      _floating: unknown,
      update: () => void,
    ) => {
      updateCallbacks.push(update)
      update()
      return () => {}
    },
  }
})

describe('anchorSetup lockPlacement', () => {
  afterEach(() => {
    computePositionMock.mockReset()
    updateCallbacks.length = 0
    document.body.replaceChildren()
  })

  const optionsOfCall = (callIndex: number): Partial<ComputePositionConfig> =>
    pipe(
      Array_.get(computePositionMock.mock.calls, callIndex),
      Option.map(([, , options]) => options),
      Option.getOrThrowWith(
        () =>
          new Error(`Expected a computePosition call at index ${callIndex}`),
      ),
    )

  const middlewareNamesOfCall = (callIndex: number): Array<string> =>
    pipe(
      optionsOfCall(callIndex).middleware ?? [],
      Array_.flatMap(middleware => (middleware ? [middleware.name] : [])),
    )

  const triggerUpdate = (callbackIndex: number): void => {
    const update = pipe(
      Array_.get(updateCallbacks, callbackIndex),
      Option.getOrThrowWith(
        () =>
          new Error(
            `Expected an autoUpdate callback at index ${callbackIndex}`,
          ),
      ),
    )
    update()
  }

  const mountAnchor = (anchor: AnchorConfig): HTMLElement => {
    const button = document.createElement('button')
    button.id = BUTTON_ID
    const element = document.createElement('div')
    document.body.append(button, element)
    anchorSetup({ buttonId: BUTTON_ID, anchor })(element)
    return element
  }

  const waitForPosition = (
    element: HTMLElement,
    x: number,
    y: number,
  ): Promise<void> =>
    vi.waitFor(() => {
      expect(element.style.left).toBe(`${x}px`)
      expect(element.style.top).toBe(`${y}px`)
    })

  it('locks the resolved placement and drops flip on later updates', async () => {
    computePositionMock
      .mockResolvedValueOnce({ x: 10, y: 20, placement: 'top-start' })
      .mockResolvedValueOnce({ x: 11, y: 21, placement: 'top-start' })
    const element = mountAnchor({
      placement: 'bottom-start',
      lockPlacement: true,
      portal: false,
    })

    await waitForPosition(element, 10, 20)

    expect(optionsOfCall(0).placement).toBe('bottom-start')
    expect(middlewareNamesOfCall(0)).toContain('flip')

    triggerUpdate(0)
    await waitForPosition(element, 11, 21)

    expect(optionsOfCall(1).placement).toBe('top-start')
    expect(middlewareNamesOfCall(1)).toEqual(['offset', 'shift', 'size'])
  })

  it('keeps flip and writes no attribute without lockPlacement', async () => {
    computePositionMock
      .mockResolvedValueOnce({ x: 10, y: 20, placement: 'top-start' })
      .mockResolvedValueOnce({ x: 11, y: 21, placement: 'bottom-start' })
    const element = mountAnchor({ placement: 'bottom-start', portal: false })

    await waitForPosition(element, 10, 20)

    expect(middlewareNamesOfCall(0)).toContain('flip')
    expect(element.hasAttribute('data-placement')).toBe(false)

    triggerUpdate(0)
    await waitForPosition(element, 11, 21)

    expect(middlewareNamesOfCall(1)).toContain('flip')
    expect(optionsOfCall(1).placement).toBe('bottom-start')
    expect(element.hasAttribute('data-placement')).toBe(false)
  })

  it('writes the locked side to data-placement', async () => {
    computePositionMock
      .mockResolvedValueOnce({ x: 10, y: 20, placement: 'bottom-end' })
      .mockResolvedValueOnce({ x: 11, y: 21, placement: 'bottom-end' })
    const element = mountAnchor({
      placement: 'bottom-start',
      lockPlacement: true,
      portal: false,
    })

    await waitForPosition(element, 10, 20)

    expect(element.getAttribute('data-placement')).toBe('bottom')

    triggerUpdate(0)
    await waitForPosition(element, 11, 21)

    expect(optionsOfCall(1).placement).toBe('bottom-end')
    expect(element.getAttribute('data-placement')).toBe('bottom')
  })

  it('keeps repositioning on later updates once locked', async () => {
    computePositionMock
      .mockResolvedValueOnce({ x: 10, y: 20, placement: 'top-start' })
      .mockResolvedValueOnce({ x: 140, y: 320, placement: 'top-start' })
    const element = mountAnchor({
      placement: 'bottom-start',
      lockPlacement: true,
      portal: false,
    })

    await waitForPosition(element, 10, 20)

    triggerUpdate(0)

    await waitForPosition(element, 140, 320)
    expect(element.getAttribute('data-placement')).toBe('top')
  })

  it('discards a stale tick that resolves after the placement locks', async () => {
    const firstTick = deferPosition()
    const secondTick = deferPosition()
    computePositionMock
      .mockReturnValueOnce(firstTick.promise)
      .mockReturnValueOnce(secondTick.promise)
      .mockResolvedValue({ x: 30, y: 40, placement: 'top-start' })
    const element = mountAnchor({
      placement: 'bottom-start',
      lockPlacement: true,
      portal: false,
    })

    triggerUpdate(0)

    expect(middlewareNamesOfCall(1)).toContain('flip')

    secondTick.resolve({ x: 5, y: 6, placement: 'top-start' })
    await waitForPosition(element, 5, 6)

    expect(element.getAttribute('data-placement')).toBe('top')

    firstTick.resolve({ x: 7, y: 8, placement: 'bottom-end' })
    await flushPromises()

    expect(element.style.left).toBe('5px')
    expect(element.style.top).toBe('6px')
    expect(element.getAttribute('data-placement')).toBe('top')

    triggerUpdate(0)
    expect(optionsOfCall(2).placement).toBe('top-start')
  })

  it('exposes a horizontal side, not only top and bottom', async () => {
    computePositionMock.mockResolvedValue({
      x: 10,
      y: 20,
      placement: 'left-start',
    })
    const element = mountAnchor({
      placement: 'right-start',
      lockPlacement: true,
      portal: false,
    })

    await waitForPosition(element, 10, 20)

    expect(element.getAttribute('data-placement')).toBe('left')
  })
})
