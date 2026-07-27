import { Context, Stream } from 'effect'
import { afterEach, beforeEach, expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import type { MountAction } from '../mount/index.js'
import { MountTracker } from '../mount/index.js'
import { Dispatch } from '../runtime/index.js'
import { h as snabbdomH } from '../snabbdom/index.js'
import {
  type BoundaryRegistry,
  beginRender,
  createBoundaryRegistry,
} from './boundary.js'
import {
  type ChildAttribute,
  childAttributes,
  rootAttributes,
} from './childAttribute.js'
import {
  FOLDKIT_MOUNT_KEY,
  type FoldkitMountMarker,
  type Html,
  html,
} from './index.js'
import {
  type DispatchSync,
  clearRuntime,
  setRuntime,
} from './runtimeSingleton.js'
import { defineView, submodel } from './submodel.js'

const setUpRuntime = (
  registry: BoundaryRegistry,
  dispatched: Array<unknown>,
): void => {
  const dispatchSync: DispatchSync = message => {
    dispatched.push(message)
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
  setRuntime(dispatchSync, context, registry)
}

type ChildClicked = Readonly<{ _tag: 'ChildClicked' }>
type ParentDirect = Readonly<{ _tag: 'ParentDirect' }>
type GotChild = Readonly<{ _tag: 'GotChild'; message: ChildClicked }>

const GotChild = (args: { message: ChildClicked }): GotChild => ({
  _tag: 'GotChild',
  ...args,
})

describe('childAttributes', () => {
  let registry: BoundaryRegistry
  let dispatched: Array<unknown>

  beforeEach(() => {
    registry = createBoundaryRegistry()
    dispatched = []
    setUpRuntime(registry, dispatched)
    beginRender(registry)
  })

  afterEach(() => {
    clearRuntime()
  })

  it('routes a published OnClick through the Submodel boundary even when the consumer builds the element in the parent boundary', () => {
    // This is the scenario the ChildAttribute design solves. The
    // Submodel publishes attribute records that the consumer spreads
    // into its own `h.div(...)` in the parent's boundary. Without
    // childAttributes, the handler would close over the parent's
    // dispatcher at vnode-construction time and bypass the Submodel's
    // wrap. With childAttributes, the published attribute carries
    // the child's dispatcher and the runtime routes the handler
    // through Checkbox's wrap.
    type CheckboxViewInputs = Readonly<{
      toView: (attributes: { checkbox: ReadonlyArray<ChildAttribute> }) => Html
    }>

    const fakeCheckboxView = defineView<
      object,
      ChildClicked,
      CheckboxViewInputs
    >((_model, viewInputs) => {
      const h = html<ChildClicked>()
      const checkboxAttributes = [h.OnClick({ _tag: 'ChildClicked' })]
      return viewInputs.toView({
        checkbox: childAttributes(checkboxAttributes),
      })
    })

    const result = submodel({
      slotId: 'fake-checkbox',
      model: {},
      view: fakeCheckboxView,
      viewInputs: {
        toView: attributes => {
          const hParent = html<ParentDirect>()
          return hParent.div([...attributes.checkbox], [])
        },
      },
      toParentMessage: message => GotChild({ message }),
    })

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const onClick = result?.data?.on?.click as () => void
    onClick()

    expect(dispatched).toEqual([
      {
        _tag: 'GotChild',
        message: { _tag: 'ChildClicked' },
      },
    ])
  })

  it("preserves the consumer's own OnClick alongside published ChildAttributes", () => {
    // The consumer can mix its own attributes with the published
    // ones. Each routes through the correct dispatcher: the consumer's
    // OnClick goes unwrapped (parent boundary), the published one
    // routes through the Submodel's wrap.
    type CheckboxViewInputs = Readonly<{
      toView: (attributes: { checkbox: ReadonlyArray<ChildAttribute> }) => Html
    }>

    const fakeCheckboxView = defineView<
      object,
      ChildClicked,
      CheckboxViewInputs
    >((_model, viewInputs) => {
      const h = html<ChildClicked>()
      const checkboxAttributes = [h.OnClick({ _tag: 'ChildClicked' })]
      return viewInputs.toView({
        checkbox: childAttributes(checkboxAttributes),
      })
    })

    const result = submodel({
      slotId: 'fake-checkbox',
      model: {},
      view: fakeCheckboxView,
      viewInputs: {
        toView: attributes => {
          const hParent = html<ParentDirect>()
          // Consumer wraps Checkbox's checkbox attributes in a button,
          // adding their own keyup handler. The keyup should dispatch
          // ParentDirect (no wrap); the click should dispatch
          // GotChild({ ChildClicked }).
          return hParent.button(
            [
              ...attributes.checkbox,
              hParent.OnKeyPress(() => ({
                _tag: 'ParentDirect' as const,
              })),
            ],
            [],
          )
        },
      },
      toParentMessage: message => GotChild({ message }),
    })

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const onClick = result?.data?.on?.click as () => void
    onClick()

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const onKeyPress = result?.data?.on?.keypress as (e: KeyboardEvent) => void
    onKeyPress(
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      {
        key: 'a',
        shiftKey: false,
        ctrlKey: false,
        altKey: false,
        metaKey: false,
      } as KeyboardEvent,
    )

    expect(dispatched).toEqual([
      {
        _tag: 'GotChild',
        message: { _tag: 'ChildClicked' },
      },
      { _tag: 'ParentDirect' },
    ])
  })

  it('binds each attribute group to the boundary that called childAttributes', () => {
    // Two Submodels publish separate attribute groups. Each group's
    // handlers route through its own Submodel's wrap, not the other's.
    // When both publish a handler for the same DOM event (here, click),
    // both fire in spread order with their own wrap applied.
    type FirstChild = Readonly<{ _tag: 'FirstChild' }>
    type SecondChild = Readonly<{ _tag: 'SecondChild' }>
    type GotFirst = Readonly<{ _tag: 'GotFirst'; message: FirstChild }>
    type GotSecond = Readonly<{ _tag: 'GotSecond'; message: SecondChild }>

    const GotFirst = (args: { message: FirstChild }): GotFirst => ({
      _tag: 'GotFirst',
      ...args,
    })
    const GotSecond = (args: { message: SecondChild }): GotSecond => ({
      _tag: 'GotSecond',
      ...args,
    })

    type CaptureInputs = Readonly<{
      capture: (attributes: ReadonlyArray<ChildAttribute>) => void
    }>

    let firstAttributes: ReadonlyArray<ChildAttribute> = []
    let secondAttributes: ReadonlyArray<ChildAttribute> = []

    submodel({
      slotId: 'first',
      model: {},
      view: defineView<object, FirstChild, CaptureInputs>((_, viewInputs) => {
        const h = html<FirstChild>()
        firstAttributes = childAttributes([h.OnClick({ _tag: 'FirstChild' })])
        viewInputs.capture(firstAttributes)
        return snabbdomH('span')
      }),
      viewInputs: {
        capture: attributes => {
          firstAttributes = attributes
        },
      },
      toParentMessage: message => GotFirst({ message }),
    })

    submodel({
      slotId: 'second',
      model: {},
      view: defineView<object, SecondChild, CaptureInputs>((_, viewInputs) => {
        const h = html<SecondChild>()
        secondAttributes = childAttributes([h.OnClick({ _tag: 'SecondChild' })])
        viewInputs.capture(secondAttributes)
        return snabbdomH('span')
      }),
      viewInputs: {
        capture: attributes => {
          secondAttributes = attributes
        },
      },
      toParentMessage: message => GotSecond({ message }),
    })

    // Build a parent vnode using both attribute sets and verify each
    // routes correctly.
    const hParent = html<ParentDirect>()
    const merged = hParent.div([...firstAttributes, ...secondAttributes], [])

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const onClick = merged?.data?.on?.click as () => void
    onClick()

    expect(dispatched).toEqual([
      { _tag: 'GotFirst', message: { _tag: 'FirstChild' } },
      { _tag: 'GotSecond', message: { _tag: 'SecondChild' } },
    ])
  })

  it("fires both the published ChildAttribute OnClick and the consumer's own OnClick on the same element", () => {
    // Regression for the same-event overwrite bug. Previously
    // `updateDataOn` used `Object.assign`, so a consumer spreading a
    // published ChildAttribute OnClick alongside their own OnClick
    // would silently drop one of the two. The chained behavior fires
    // both in spread order, each through the correct dispatch chain.
    type FakeViewInputs = Readonly<{
      toView: (inputs: { attributes: ReadonlyArray<ChildAttribute> }) => Html
    }>

    const fakeView = defineView<object, ChildClicked, FakeViewInputs>(
      (_model, viewInputs) => {
        const h = html<ChildClicked>()
        return viewInputs.toView({
          attributes: childAttributes([h.OnClick({ _tag: 'ChildClicked' })]),
        })
      },
    )

    const result = submodel({
      slotId: 'fake',
      model: {},
      view: fakeView,
      viewInputs: {
        toView: inputs => {
          const hParent = html<ParentDirect>()
          return hParent.button(
            [...inputs.attributes, hParent.OnClick({ _tag: 'ParentDirect' })],
            [],
          )
        },
      },
      toParentMessage: message => GotChild({ message }),
    })

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const onClick = result?.data?.on?.click as () => void
    onClick()

    expect(dispatched).toEqual([
      { _tag: 'GotChild', message: { _tag: 'ChildClicked' } },
      { _tag: 'ParentDirect' },
    ])
  })
})

describe('rootAttributes', () => {
  let registry: BoundaryRegistry
  let dispatched: Array<unknown>

  beforeEach(() => {
    registry = createBoundaryRegistry()
    dispatched = []
    setUpRuntime(registry, dispatched)
    beginRender(registry)
  })

  afterEach(() => {
    clearRuntime()
  })

  type AppLevel = Readonly<{ _tag: 'AppLevel' }>

  const renderInsideSubmodel = (build: () => Html, slotId = 'chrome') =>
    submodel({
      slotId,
      model: {},
      view: defineView<object, ChildClicked, object>(build),
      viewInputs: {},
      toParentMessage: message => GotChild({ message }),
    })

  it('delivers an app-level message unwrapped from inside a Submodel', () => {
    // Without rootAttributes this same handler dispatches
    // GotChild({ message: { _tag: 'AppLevel' } }), which a parent's Schema
    // rejects because AppLevel is not in the child's Message union.
    const h = html<AppLevel>()
    const result = renderInsideSubmodel(() =>
      h.button([...rootAttributes([h.OnClick({ _tag: 'AppLevel' })])], []),
    )

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const onClick = result?.data?.on?.click as () => void
    onClick()

    expect(dispatched).toEqual([{ _tag: 'AppLevel' }])
  })

  it("leaves the Submodel's own handlers routed through its wrap", () => {
    const h = html<ChildClicked>()
    const result = renderInsideSubmodel(() =>
      h.button([h.OnClick({ _tag: 'ChildClicked' })], []),
    )

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const onClick = result?.data?.on?.click as () => void
    onClick()

    expect(dispatched).toEqual([
      { _tag: 'GotChild', message: { _tag: 'ChildClicked' } },
    ])
  })

  it('skips every lift when Submodels are nested more than one deep', () => {
    const h = html<AppLevel>()
    const result = renderInsideSubmodel(() =>
      submodel({
        slotId: 'inner',
        model: {},
        view: defineView<object, ChildClicked, object>(() =>
          h.button([...rootAttributes([h.OnClick({ _tag: 'AppLevel' })])], []),
        ),
        viewInputs: {},
        toParentMessage: message => GotChild({ message }),
      }),
    )

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const onClick = result?.data?.on?.click as () => void
    onClick()

    expect(dispatched).toEqual([{ _tag: 'AppLevel' }])
  })

  it('dispatches unwrapped at the root boundary too, where there is no wrap to skip', () => {
    const h = html<AppLevel>()
    const button = h.button(
      [...rootAttributes([h.OnClick({ _tag: 'AppLevel' })])],
      [],
    )

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const onClick = button?.data?.on?.click as () => void
    onClick()

    expect(dispatched).toEqual([{ _tag: 'AppLevel' }])
  })

  it('routes a root-bound and a child-bound group on one element to their own dispatchers', () => {
    const hApp = html<AppLevel>()
    const result = renderInsideSubmodel(() =>
      hApp.button(
        [
          ...rootAttributes([hApp.OnClick({ _tag: 'AppLevel' })]),
          ...childAttributes([
            html<ChildClicked>().OnKeyPress(() => ({
              _tag: 'ChildClicked' as const,
            })),
          ]),
        ],
        [],
      ),
    )

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const onClick = result?.data?.on?.click as () => void
    onClick()
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const onKeyPress = result?.data?.on?.keypress as (e: KeyboardEvent) => void
    onKeyPress(
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      {
        key: 'a',
        shiftKey: false,
        ctrlKey: false,
        altKey: false,
        metaKey: false,
      } as KeyboardEvent,
    )

    expect(dispatched).toEqual([
      { _tag: 'AppLevel' },
      { _tag: 'GotChild', message: { _tag: 'ChildClicked' } },
    ])
  })

  it('sends an OnUnmount message straight to the root, skipping the wrap', () => {
    const h = html<AppLevel>()
    const result = renderInsideSubmodel(() =>
      h.div([...rootAttributes([h.OnUnmount({ _tag: 'AppLevel' })])], []),
    )

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const destroy = result?.data?.hook?.destroy as (vnode: unknown) => void
    destroy(result)

    expect(dispatched).toEqual([{ _tag: 'AppLevel' }])
  })

  it('stamps no lift on an OnMount marker, so the Scene harness replays none', () => {
    // A childAttributes group at this same boundary stamps a one-entry
    // messageMappers chain; a root-bound group must stamp none.
    const h = html<AppLevel>()
    const probe: MountAction<AppLevel> = {
      name: 'Probe',
      f: () => Stream.empty,
    }

    const rootBound = renderInsideSubmodel(
      () => h.div([...rootAttributes([h.OnMount(probe)])], []),
      'root-bound',
    )
    const childBound = renderInsideSubmodel(
      () => h.div([...childAttributes([h.OnMount(probe)])], []),
      'child-bound',
    )

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const markerOf = (vnode: typeof rootBound) =>
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      (vnode?.data as Record<string, FoldkitMountMarker> | undefined)?.[
        FOLDKIT_MOUNT_KEY
      ]

    expect(markerOf(rootBound)?.messageMappers).toBeUndefined()
    expect(markerOf(childBound)?.messageMappers).toHaveLength(1)
  })

  it('builds outside a runtime frame and throws only when the handler fires', () => {
    clearRuntime()

    const h = html<AppLevel>()
    const button = h.button(
      [...rootAttributes([h.OnClick({ _tag: 'AppLevel' })])],
      [],
    )

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const onClick = button?.data?.on?.click as () => void
    expect(onClick).toThrow('without an active runtime frame')

    setUpRuntime(registry, dispatched)
  })
})
