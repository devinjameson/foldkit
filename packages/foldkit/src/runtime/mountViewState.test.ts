import {
  Array as Array_,
  Effect,
  Exit,
  Fiber,
  Function,
  Option,
  PubSub,
  Queue,
  Schema as S,
  Stream,
  SubscriptionRef,
} from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { DevToolsStore } from '../devTools/store.js'
import { INIT_INDEX, latestEntryIndex } from '../devTools/store.js'
import { type Html, Prop, __htmlBuilder, createLazy } from '../html/index.js'
import { defineMessageUnion } from '../message/index.js'
import * as Mount from '../mount/index.js'
import { evo } from '../struct/index.js'
import * as Subscription from '../subscription/subscription.js'
import type * as Update from '../update/index.js'
import {
  __setDevToolsOverlay,
  makeApplication,
  makeElement,
} from './runtime.js'

const Message = defineMessageUnion({
  CompletedMountEditor: {},
  EditedFromMount: {},
  Ticked: {},
  ShowedEditor: {},
  HidEditor: {},
})
type Message = typeof Message.Type
type EditorMessage =
  typeof Message.CompletedMountEditor.Type | typeof Message.EditedFromMount.Type

const Model = S.Struct({
  mountEditCount: S.Number,
  tickCount: S.Number,
  isEditorShown: S.Boolean,
})
type Model = typeof Model.Type

const initialModel = (isEditorShown: boolean): Model => ({
  mountEditCount: 0,
  tickCount: 0,
  isEditorShown,
})

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    CompletedMountEditor: () => ({ model }),
    EditedFromMount: () => ({
      model: evo(model, { mountEditCount: count => count + 1 }),
    }),
    Ticked: () => ({
      model: evo(model, { tickCount: count => count + 1 }),
    }),
    ShowedEditor: () => ({
      model: evo(model, { isEditorShown: () => true }),
    }),
    HidEditor: () => ({
      model: evo(model, { isEditorShown: () => false }),
    }),
  })

const h = __htmlBuilder<Message>()

const editorView = (mount: Mount.MountAction<Message>): Html =>
  h.div([h.Id('editor'), h.OnMount(mount)])

const modelView = (model: Model, mount: Mount.MountAction<Message>): Html =>
  h.div(
    [],
    [
      h.button([h.OnClick(Message.ShowedEditor())], ['show']),
      h.button([h.OnClick(Message.HidEditor())], ['hide']),
      h.div([], [`mount:${model.mountEditCount}`]),
      h.div([], [`ticks:${model.tickCount}`]),
      ...(model.isEditorShown ? [editorView(mount)] : []),
    ],
  )

const requireElement = (selector: string): Element => {
  const element = document.querySelector(selector)
  if (element === null) {
    throw new Error(`Expected ${selector} to exist`)
  }
  return element
}

const requireDevToolsStore = (
  maybeStore: DevToolsStore | null,
): DevToolsStore => {
  if (maybeStore === null) {
    throw new Error('Expected the DevTools store to be installed')
  }
  return maybeStore
}

const clickButton = (label: string): void => {
  const button = Array_.findFirst(
    document.querySelectorAll('button'),
    element => element.textContent === label,
  )
  if (Option.isNone(button)) {
    throw new Error(`Expected the ${label} button to exist`)
  }
  button.value.click()
}

const waitForBodyText = (text: string): Promise<void> =>
  vi.waitFor(() => {
    expect(document.body.textContent).toContain(text)
  })

const waitForMountEmission = (): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, 10))

const waitForTwoAnimationFrames = (): Promise<void> =>
  new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })

let container: HTMLElement

beforeEach(() => {
  container = document.createElement('div')
  container.id = 'app'
  document.body.appendChild(container)
})

afterEach(() => {
  __setDevToolsOverlay(undefined)
  document.body.innerHTML = ''
})

describe('Mount view-state awareness', () => {
  it('keeps a surviving Mount alive, gates its Messages, and leaves Subscriptions live while the view is paused', async () => {
    const subscriptionMessages = await Effect.runPromise(
      PubSub.unbounded<Message>(),
    )
    const subscriptions = Subscription.make<Model, Message>()(() => ({
      testMessages: Subscription.persistent(
        Stream.fromPubSub(subscriptionMessages),
      ),
    }))
    const observedViewStates: Array<Mount.ViewState> = []
    const processedTags: Array<Message['_tag']> = []
    let acquireCount = 0
    let releaseCount = 0
    let emitMountMessage: (message: EditorMessage) => void = Function.constVoid

    const MountEditor = Mount.defineStream('MountEditor', {
      messages: [Message.CompletedMountEditor, Message.EditedFromMount],
      execute: ({ element, viewStateChanges }) =>
        Stream.callback<EditorMessage>(queue =>
          Effect.gen(function* () {
            yield* Effect.acquireRelease(
              Effect.sync(() => {
                acquireCount += 1
                emitMountMessage = message => Queue.offerUnsafe(queue, message)
                return element
              }),
              mountedElement =>
                Effect.sync(() => {
                  releaseCount += 1
                  mountedElement.removeAttribute('data-readonly')
                  emitMountMessage = Function.constVoid
                }),
            )
            yield* viewStateChanges.pipe(
              Stream.runForEach(viewState =>
                Effect.sync(() => {
                  observedViewStates.push(viewState)
                  element.toggleAttribute(
                    'data-readonly',
                    viewState === 'Paused',
                  )
                }),
              ),
              Effect.forkScoped,
            )
            Queue.offerUnsafe(queue, Message.CompletedMountEditor())
            return yield* Effect.never
          }),
        ),
    })

    let maybeStore: DevToolsStore | null = null
    __setDevToolsOverlay(store => {
      maybeStore = store
      return Effect.void
    })

    const runtime = makeElement({
      Model,
      init: () => ({ model: initialModel(true) }),
      update: (model, message) => {
        processedTags.push(message._tag)
        return update(model, message)
      },
      view: model => modelView(model, MountEditor()),
      subscriptions,
      container,
      devTools: { show: 'Always', keyframeInterval: 1 },
    })
    const runtimeFiber = Effect.runFork(runtime.start())

    try {
      await vi.waitFor(() => {
        expect(maybeStore).not.toBeNull()
        expect(observedViewStates).toEqual(['Live'])
        expect(acquireCount).toBe(1)
      })
      const store = requireDevToolsStore(maybeStore)
      const editor = requireElement('#editor')

      await Effect.runPromise(store.jumpTo(INIT_INDEX))

      await vi.waitFor(() => {
        expect(observedViewStates).toEqual(['Live', 'Paused'])
        expect(editor.hasAttribute('data-readonly')).toBe(true)
      })
      expect(requireElement('#editor')).toBe(editor)
      expect(acquireCount).toBe(1)
      expect(releaseCount).toBe(0)

      emitMountMessage(Message.EditedFromMount())
      await waitForMountEmission()

      expect(processedTags).not.toContain('EditedFromMount')

      PubSub.publishUnsafe(subscriptionMessages, Message.Ticked())
      await vi.waitFor(async () => {
        expect(processedTags).toContain('Ticked')
        const state = await Effect.runPromise(
          SubscriptionRef.get(store.stateRef),
        )
        expect(
          Array_.some(state.entries, entry => entry.tag === 'Ticked'),
        ).toBe(true)
      })
      expect(document.body.textContent).toContain('ticks:0')

      await Effect.runPromise(store.resume)

      await vi.waitFor(() => {
        expect(observedViewStates).toEqual(['Live', 'Paused', 'Live'])
        expect(editor.hasAttribute('data-readonly')).toBe(false)
      })
      await waitForBodyText('ticks:1')
      expect(requireElement('#editor')).toBe(editor)
      expect(acquireCount).toBe(1)
      expect(releaseCount).toBe(0)

      emitMountMessage(Message.EditedFromMount())
      await vi.waitFor(() => {
        expect(processedTags).toContain('EditedFromMount')
      })
      await waitForBodyText('mount:1')
    } finally {
      await Effect.runPromise(Fiber.interrupt(runtimeFiber))
    }

    await vi.waitFor(() => {
      expect(releaseCount).toBe(1)
    })
  })

  it('keeps a replay-inserted Mount paused and suppresses its result', async () => {
    const subscriptionMessages = await Effect.runPromise(
      PubSub.unbounded<Message>({ replay: 1 }),
    )
    const subscriptions = Subscription.make<Model, Message>()(() => ({
      testMessages: Subscription.persistent(
        Stream.fromPubSub(subscriptionMessages),
      ),
    }))
    const statesByAcquisition: Array<Array<Mount.ViewState>> = []
    const processedTags: Array<Message['_tag']> = []
    let releaseCount = 0

    const MountEditor = Mount.define('MountEditor', {
      messages: [Message.CompletedMountEditor],
      execute: ({ element, viewStateChanges }) =>
        Effect.gen(function* () {
          const observedViewStates: Array<Mount.ViewState> = []
          statesByAcquisition.push(observedViewStates)
          yield* Effect.acquireRelease(
            Effect.sync(() => element.setAttribute('data-editor', 'mounted')),
            () =>
              Effect.sync(() => {
                releaseCount += 1
              }),
          )
          yield* viewStateChanges.pipe(
            Stream.runForEach(viewState =>
              Effect.sync(() => observedViewStates.push(viewState)),
            ),
            Effect.forkScoped,
          )
          return Message.CompletedMountEditor()
        }),
    })

    let maybeStore: DevToolsStore | null = null
    __setDevToolsOverlay(store => {
      maybeStore = store
      return Effect.void
    })

    const runtime = makeElement({
      Model,
      init: () => ({ model: initialModel(false) }),
      update: (model, message) => {
        processedTags.push(message._tag)
        return update(model, message)
      },
      view: model => modelView(model, MountEditor()),
      subscriptions,
      container,
      devTools: { show: 'Always', keyframeInterval: 1 },
    })
    const runtimeFiber = Effect.runFork(runtime.start())

    try {
      await vi.waitFor(() => {
        expect(maybeStore).not.toBeNull()
      })
      const store = requireDevToolsStore(maybeStore)

      clickButton('show')
      await vi.waitFor(() => {
        expect(statesByAcquisition).toEqual([['Live']])
        expect(
          Array_.filter(processedTags, tag => tag === 'CompletedMountEditor'),
        ).toHaveLength(1)
      })
      const shownState = await Effect.runPromise(
        SubscriptionRef.get(store.stateRef),
      )
      const shownIndex = latestEntryIndex(shownState)

      clickButton('hide')
      await vi.waitFor(() => {
        expect(document.querySelector('#editor')).toBeNull()
        expect(releaseCount).toBe(1)
      })

      await Effect.runPromise(store.jumpTo(shownIndex))

      await vi.waitFor(() => {
        expect(statesByAcquisition).toEqual([['Live'], ['Paused']])
      })
      expect(requireElement('#editor').getAttribute('data-editor')).toBe(
        'mounted',
      )
      const replayEditor = requireElement('#editor')

      PubSub.publishUnsafe(subscriptionMessages, Message.ShowedEditor())
      await vi.waitFor(() => {
        expect(
          Array_.filter(processedTags, tag => tag === 'ShowedEditor'),
        ).toHaveLength(2)
      })

      await Effect.runPromise(store.resume)
      await vi.waitFor(() => {
        expect(statesByAcquisition).toEqual([['Live'], ['Paused', 'Live']])
      })
      expect(requireElement('#editor')).toBe(replayEditor)
      expect(releaseCount).toBe(1)
      expect(
        Array_.filter(processedTags, tag => tag === 'CompletedMountEditor'),
      ).toHaveLength(1)
    } finally {
      await Effect.runPromise(Fiber.interrupt(runtimeFiber))
    }

    await vi.waitFor(() => {
      expect(releaseCount).toBe(2)
    })
  })

  it('delivers a result from a Mount inserted by the live resume patch', async () => {
    const subscriptionMessages = await Effect.runPromise(
      PubSub.unbounded<Message>({ replay: 1 }),
    )
    const subscriptions = Subscription.make<Model, Message>()(() => ({
      testMessages: Subscription.persistent(
        Stream.fromPubSub(subscriptionMessages),
      ),
    }))
    const processedTags: Array<Message['_tag']> = []

    const mountEditor: Mount.MountAction<Message> = {
      name: 'MountEditor',
      f: () => Stream.make(Message.CompletedMountEditor()),
    }

    let maybeStore: DevToolsStore | null = null
    __setDevToolsOverlay(store => {
      maybeStore = store
      return Effect.void
    })

    const runtime = makeElement({
      Model,
      init: () => ({ model: initialModel(false) }),
      update: (model, message) => {
        processedTags.push(message._tag)
        return update(model, message)
      },
      view: model => modelView(model, mountEditor),
      subscriptions,
      container,
      devTools: { show: 'Always', keyframeInterval: 1 },
    })
    const runtimeFiber = Effect.runFork(runtime.start())

    try {
      await vi.waitFor(() => {
        expect(maybeStore).not.toBeNull()
      })
      const store = requireDevToolsStore(maybeStore)

      await Effect.runPromise(store.jumpTo(INIT_INDEX))
      PubSub.publishUnsafe(subscriptionMessages, Message.ShowedEditor())

      await vi.waitFor(() => {
        expect(processedTags).toContain('ShowedEditor')
      })
      expect(document.querySelector('#editor')).toBeNull()
      expect(processedTags).not.toContain('CompletedMountEditor')

      await Effect.runPromise(store.resume)

      await vi.waitFor(() => {
        expect(document.querySelector('#editor')).not.toBeNull()
        expect(processedTags).toContain('CompletedMountEditor')
      })
    } finally {
      await Effect.runPromise(Fiber.interrupt(runtimeFiber))
    }
  })

  it('delivers a result when resume inserts a cached lazy Mount', async () => {
    const processedTags: Array<Message['_tag']> = []
    let renderEditorCount = 0
    const mountEditor: Mount.MountAction<Message> = {
      name: 'MountEditor',
      f: () => Stream.make(Message.CompletedMountEditor()),
    }
    const lazyEditor = createLazy()
    const renderEditor = (): Html => {
      renderEditorCount += 1
      return editorView(mountEditor)
    }
    const renderLazyEditor = (): Html => {
      const maybeEditor = lazyEditor(renderEditor, [])
      if (maybeEditor === null) {
        throw new Error('Expected the lazy editor view to return an element')
      }
      return maybeEditor
    }

    let maybeStore: DevToolsStore | null = null
    __setDevToolsOverlay(store => {
      maybeStore = store
      return Effect.void
    })

    const runtime = makeElement({
      Model,
      init: () => ({ model: initialModel(false) }),
      update: (model: Model, message: Message) => {
        processedTags.push(message._tag)
        return update(model, message)
      },
      view: (model: Model) =>
        h.div(
          [],
          [
            h.button([h.OnClick(Message.ShowedEditor())], ['show']),
            ...(model.isEditorShown ? [renderLazyEditor()] : []),
          ],
        ),
      container,
      devTools: { show: 'Always', keyframeInterval: 1 },
    })
    const runtimeFiber = Effect.runFork(runtime.start())

    try {
      await vi.waitFor(() => {
        expect(maybeStore).not.toBeNull()
      })
      const store = requireDevToolsStore(maybeStore)

      clickButton('show')
      await vi.waitFor(() => {
        expect(document.querySelector('#editor')).not.toBeNull()
        expect(
          Array_.filter(processedTags, tag => tag === 'CompletedMountEditor'),
        ).toHaveLength(1)
        expect(renderEditorCount).toBe(1)
      })

      await Effect.runPromise(store.jumpTo(INIT_INDEX))
      expect(document.querySelector('#editor')).toBeNull()

      await Effect.runPromise(store.resume)
      await vi.waitFor(() => {
        expect(document.querySelector('#editor')).not.toBeNull()
        expect(
          Array_.filter(processedTags, tag => tag === 'CompletedMountEditor'),
        ).toHaveLength(2)
        expect(renderEditorCount).toBe(1)
      })
    } finally {
      await Effect.runPromise(Fiber.interrupt(runtimeFiber))
    }
  })

  it('restores the live view when rendering a historical view fails', async () => {
    const observedViewStates: Array<Mount.ViewState> = []
    const processedTags: Array<Message['_tag']> = []
    let isHistoricalViewBroken = false

    const ObserveViewState = Mount.define('ObserveViewState', {
      messages: [Message.CompletedMountEditor],
      execute: ({ viewStateChanges }) =>
        Effect.gen(function* () {
          yield* viewStateChanges.pipe(
            Stream.runForEach(viewState =>
              Effect.sync(() => observedViewStates.push(viewState)),
            ),
            Effect.forkScoped,
          )
          return Message.CompletedMountEditor()
        }),
    })
    const mountEditor: Mount.MountAction<Message> = {
      name: 'MountEditor',
      f: () => Stream.never,
    }

    let maybeStore: DevToolsStore | null = null
    __setDevToolsOverlay(store => {
      maybeStore = store
      return Effect.void
    })

    const runtime = makeElement({
      Model,
      init: () => ({ model: initialModel(false) }),
      update: (model: Model, message: Message) => {
        processedTags.push(message._tag)
        return update(model, message)
      },
      view: (model: Model) => {
        if (isHistoricalViewBroken && model.isEditorShown) {
          throw new Error('Historical view failed')
        }
        return h.div(
          [h.OnMount(ObserveViewState())],
          [modelView(model, mountEditor)],
        )
      },
      crash: { view: () => h.div([], ['Crashed']) },
      container,
      devTools: { show: 'Always', keyframeInterval: 1 },
    })
    const runtimeFiber = Effect.runFork(runtime.start())

    try {
      await vi.waitFor(() => {
        expect(maybeStore).not.toBeNull()
        expect(observedViewStates).toEqual(['Live'])
      })
      const store = requireDevToolsStore(maybeStore)

      clickButton('show')
      await vi.waitFor(() => {
        expect(document.querySelector('#editor')).not.toBeNull()
      })
      const shownState = await Effect.runPromise(
        SubscriptionRef.get(store.stateRef),
      )
      const shownIndex = latestEntryIndex(shownState)

      clickButton('hide')
      await vi.waitFor(() => {
        expect(document.querySelector('#editor')).toBeNull()
      })
      isHistoricalViewBroken = true

      const jumpExit = await Effect.runPromise(
        Effect.exit(store.jumpTo(shownIndex)),
      )

      expect(Exit.isFailure(jumpExit)).toBe(true)
      await vi.waitFor(() => {
        expect(observedViewStates).toEqual(['Live', 'Paused', 'Live'])
      })
      const state = await Effect.runPromise(SubscriptionRef.get(store.stateRef))
      expect(state.isPaused).toBe(false)
      expect(document.body.textContent).not.toContain('Crashed')
      expect(document.querySelector('#editor')).toBeNull()

      isHistoricalViewBroken = false
      clickButton('show')
      await vi.waitFor(() => {
        expect(document.querySelector('#editor')).not.toBeNull()
        expect(
          Array_.filter(processedTags, tag => tag === 'ShowedEditor'),
        ).toHaveLength(2)
      })
    } finally {
      await Effect.runPromise(Fiber.interrupt(runtimeFiber))
    }
  })

  it('keeps a terminal crash view when a historical render fails', async () => {
    let isHistoricalViewBroken = false
    let shouldCrashUpdate = false

    const mountEditor: Mount.MountAction<Message> = {
      name: 'MountEditor',
      f: () => Stream.never,
    }

    let maybeStore: DevToolsStore | null = null
    __setDevToolsOverlay(store => {
      maybeStore = store
      return Effect.void
    })

    const runtime = makeElement({
      Model,
      init: () => ({ model: initialModel(false) }),
      update: (model: Model, message: Message) => {
        if (shouldCrashUpdate) {
          throw new Error('Update failed')
        }
        return update(model, message)
      },
      view: (model: Model) => {
        if (isHistoricalViewBroken && model.isEditorShown) {
          throw new Error('Historical view failed')
        }
        return modelView(model, mountEditor)
      },
      crash: { view: () => h.div([], ['Crashed']) },
      container,
      devTools: { show: 'Always', keyframeInterval: 1 },
    })
    const runtimeFiber = Effect.runFork(runtime.start())

    try {
      await vi.waitFor(() => {
        expect(maybeStore).not.toBeNull()
      })
      const store = requireDevToolsStore(maybeStore)

      clickButton('show')
      await vi.waitFor(() => {
        expect(document.querySelector('#editor')).not.toBeNull()
      })
      const shownState = await Effect.runPromise(
        SubscriptionRef.get(store.stateRef),
      )
      const shownIndex = latestEntryIndex(shownState)

      clickButton('hide')
      await vi.waitFor(() => {
        expect(document.querySelector('#editor')).toBeNull()
      })

      shouldCrashUpdate = true
      clickButton('hide')
      await waitForBodyText('Crashed')

      shouldCrashUpdate = false
      isHistoricalViewBroken = true
      const jumpExit = await Effect.runPromise(
        Effect.exit(store.jumpTo(shownIndex)),
      )

      expect(Exit.isFailure(jumpExit)).toBe(true)
      await waitForTwoAnimationFrames()
      expect(document.body.textContent).toContain('Crashed')
      expect(document.querySelector('#editor')).toBeNull()
    } finally {
      await Effect.runPromise(Fiber.interrupt(runtimeFiber))
    }
  })

  it('repaints the previous historical view when a later jump fails after patching', async () => {
    const observedViewStates: Array<Mount.ViewState> = []

    const ObserveViewState = Mount.define('ObserveViewState', {
      messages: [Message.CompletedMountEditor],
      execute: ({ viewStateChanges }) =>
        Effect.gen(function* () {
          yield* viewStateChanges.pipe(
            Stream.runForEach(viewState =>
              Effect.sync(() => observedViewStates.push(viewState)),
            ),
            Effect.forkScoped,
          )
          return Message.CompletedMountEditor()
        }),
    })
    const mountEditor: Mount.MountAction<Message> = {
      name: 'MountEditor',
      f: () => Stream.never,
    }

    let maybeStore: DevToolsStore | null = null
    __setDevToolsOverlay(store => {
      maybeStore = store
      return Effect.void
    })

    const runtime = makeApplication({
      Model,
      init: () => ({ model: initialModel(false) }),
      update,
      view: (model: Model) => ({
        title: model.isEditorShown ? 'Shown' : 'Hidden',
        body: h.div(
          [h.OnMount(ObserveViewState())],
          [modelView(model, mountEditor)],
        ),
      }),
      crash: {
        view: () => ({ title: 'Crashed', body: h.div([], ['Crashed']) }),
      },
      container,
      devTools: { show: 'Always', keyframeInterval: 1 },
    })
    const runtimeFiber = Effect.runFork(runtime.start())

    try {
      await vi.waitFor(() => {
        expect(maybeStore).not.toBeNull()
        expect(observedViewStates).toEqual(['Live'])
      })
      const store = requireDevToolsStore(maybeStore)

      clickButton('show')
      await vi.waitFor(() => {
        expect(document.querySelector('#editor')).not.toBeNull()
      })
      const shownState = await Effect.runPromise(
        SubscriptionRef.get(store.stateRef),
      )
      const shownIndex = latestEntryIndex(shownState)

      clickButton('hide')
      await vi.waitFor(() => {
        expect(document.querySelector('#editor')).toBeNull()
      })
      const hiddenState = await Effect.runPromise(
        SubscriptionRef.get(store.stateRef),
      )
      const hiddenIndex = latestEntryIndex(hiddenState)

      await Effect.runPromise(store.jumpTo(hiddenIndex))
      await vi.waitFor(() => {
        expect(observedViewStates).toEqual(['Live', 'Paused'])
        expect(document.querySelector('#editor')).toBeNull()
      })

      const titleSetter = vi
        .spyOn(document, 'title', 'set')
        .mockImplementation(title => {
          if (title === 'Shown') {
            throw new Error('Historical metadata failed')
          }
        })
      const jumpExit = await Effect.runPromise(
        Effect.exit(store.jumpTo(shownIndex)),
      ).finally(() => titleSetter.mockRestore())

      expect(Exit.isFailure(jumpExit)).toBe(true)
      const pausedState = await Effect.runPromise(
        SubscriptionRef.get(store.stateRef),
      )
      expect(pausedState.isPaused).toBe(true)
      expect(pausedState.pausedAtIndex).toBe(hiddenIndex)
      expect(observedViewStates).toEqual(['Live', 'Paused'])
      expect(document.querySelector('#editor')).toBeNull()
      expect(document.title).toBe('Hidden')
      expect(document.body.textContent).not.toContain('Crashed')

      await Effect.runPromise(store.resume)
      await vi.waitFor(() => {
        expect(observedViewStates).toEqual(['Live', 'Paused', 'Live'])
        expect(document.querySelector('#editor')).toBeNull()
      })
    } finally {
      await Effect.runPromise(Fiber.interrupt(runtimeFiber))
    }
  })

  it.each([
    { recoveryPath: 'the first jump', isPausedBeforeFailure: false },
    { recoveryPath: 'a later jump', isPausedBeforeFailure: true },
  ])(
    'rebuilds from the real DOM when $recoveryPath throws midway',
    async ({ isPausedBeforeFailure }) => {
      let isPatchFailureEnabled = false
      Object.defineProperty(HTMLElement.prototype, 'foldkitPatchFailure', {
        configurable: true,
        set: () => {
          if (isPatchFailureEnabled) {
            throw new Error('Historical property patch failed')
          }
        },
      })

      const mountEditor: Mount.MountAction<Message> = {
        name: 'MountEditor',
        f: () => Stream.never,
      }
      let maybeStore: DevToolsStore | null = null
      __setDevToolsOverlay(store => {
        maybeStore = store
        return Effect.void
      })

      const runtime = makeElement({
        Model,
        init: () => ({ model: initialModel(false) }),
        update,
        view: (model: Model) =>
          h.div(
            [],
            [
              h.button([h.OnClick(Message.ShowedEditor())], ['show']),
              h.button([h.OnClick(Message.HidEditor())], ['hide']),
              ...(model.isEditorShown
                ? [
                    h.span([h.Id('inserted-before-failure')], ['Inserted']),
                    h.div(
                      [
                        h.Id('failing-property'),
                        Prop({
                          key: 'foldkitPatchFailure',
                          value: 'fail',
                        }),
                      ],
                      ['Failure'],
                    ),
                    editorView(mountEditor),
                  ]
                : [h.p([h.Id('stable-node')], ['Stable'])]),
            ],
          ),
        crash: { view: () => h.div([], ['Crashed']) },
        container,
        devTools: { show: 'Always', keyframeInterval: 1 },
      })
      const runtimeFiber = Effect.runFork(runtime.start())

      try {
        await vi.waitFor(() => {
          expect(maybeStore).not.toBeNull()
          expect(document.querySelector('#stable-node')).not.toBeNull()
        })
        const store = requireDevToolsStore(maybeStore)

        clickButton('show')
        await vi.waitFor(() => {
          expect(
            document.querySelector('#inserted-before-failure'),
          ).not.toBeNull()
        })
        const shownState = await Effect.runPromise(
          SubscriptionRef.get(store.stateRef),
        )
        const shownIndex = latestEntryIndex(shownState)

        clickButton('hide')
        await vi.waitFor(() => {
          expect(document.querySelector('#stable-node')).not.toBeNull()
        })
        const hiddenState = await Effect.runPromise(
          SubscriptionRef.get(store.stateRef),
        )
        const hiddenIndex = latestEntryIndex(hiddenState)

        if (isPausedBeforeFailure) {
          await Effect.runPromise(store.jumpTo(hiddenIndex))
        }
        isPatchFailureEnabled = true
        const jumpExit = await Effect.runPromise(
          Effect.exit(store.jumpTo(shownIndex)),
        )

        expect(Exit.isFailure(jumpExit)).toBe(true)
        if (!isPausedBeforeFailure) {
          await vi.waitFor(() => {
            expect(document.querySelector('#stable-node')).not.toBeNull()
          })
        }
        const pausedState = await Effect.runPromise(
          SubscriptionRef.get(store.stateRef),
        )
        expect(pausedState.isPaused).toBe(isPausedBeforeFailure)
        if (isPausedBeforeFailure) {
          expect(pausedState.pausedAtIndex).toBe(hiddenIndex)
        }
        expect(document.querySelector('#stable-node')).not.toBeNull()
        expect(document.querySelector('#inserted-before-failure')).toBeNull()
        expect(document.querySelector('#failing-property')).toBeNull()
        expect(document.body.textContent).not.toContain('Crashed')

        isPatchFailureEnabled = false
        if (isPausedBeforeFailure) {
          await Effect.runPromise(store.resume)
        }
        await waitForTwoAnimationFrames()
        clickButton('show')
        await vi.waitFor(() => {
          expect(
            document.querySelector('#inserted-before-failure'),
          ).not.toBeNull()
          expect(document.querySelector('#failing-property')).not.toBeNull()
        })
      } finally {
        Reflect.deleteProperty(HTMLElement.prototype, 'foldkitPatchFailure')
        await Effect.runPromise(Fiber.interrupt(runtimeFiber))
      }
    },
  )

  it.each([
    {
      failureTiming: 'before root replacement on the first jump',
      isFailureAfterRootReplacement: false,
      isPausedBeforeFailure: false,
    },
    {
      failureTiming: 'before root replacement on a later jump',
      isFailureAfterRootReplacement: false,
      isPausedBeforeFailure: true,
    },
    {
      failureTiming: 'after root replacement on the first jump',
      isFailureAfterRootReplacement: true,
      isPausedBeforeFailure: false,
    },
    {
      failureTiming: 'after root replacement on a later jump',
      isFailureAfterRootReplacement: true,
      isPausedBeforeFailure: true,
    },
  ])(
    'recovers an empty view when a patch fails $failureTiming',
    async ({ isFailureAfterRootReplacement, isPausedBeforeFailure }) => {
      const valueDescriptor = Object.getOwnPropertyDescriptor(
        HTMLSelectElement.prototype,
        'value',
      )
      if (
        valueDescriptor?.get === undefined ||
        valueDescriptor.set === undefined
      ) {
        throw new Error('Expected HTMLSelectElement.value accessors')
      }
      const getValue = valueDescriptor.get
      const setValue = valueDescriptor.set
      let isPatchFailureEnabled = false
      Object.defineProperty(HTMLElement.prototype, 'foldkitPatchFailure', {
        configurable: true,
        set: () => {
          if (isPatchFailureEnabled && !isFailureAfterRootReplacement) {
            throw new Error('Historical root creation failed')
          }
        },
      })
      Object.defineProperty(HTMLSelectElement.prototype, 'value', {
        ...valueDescriptor,
        get: getValue,
        set(value: string) {
          setValue.call(this, value)
          if (
            isPatchFailureEnabled &&
            isFailureAfterRootReplacement &&
            this.isConnected
          ) {
            throw new Error('Historical insert hook failed')
          }
        },
      })

      const subscriptionMessages = await Effect.runPromise(
        PubSub.unbounded<Message>(),
      )
      let isSubscriptionReady = false
      const subscriptions = Subscription.make<Model, Message>()(() => ({
        testMessages: Subscription.persistent(
          Stream.fromEffect(
            Effect.sync(() => {
              isSubscriptionReady = true
            }),
          ).pipe(Stream.flatMap(() => Stream.fromPubSub(subscriptionMessages))),
        ),
      }))
      let maybeStore: DevToolsStore | null = null
      __setDevToolsOverlay(store => {
        maybeStore = store
        return Effect.void
      })
      const shownView = (): Html => {
        if (isFailureAfterRootReplacement) {
          return h.select(
            [h.Id('replacement-root'), h.Value('b')],
            [h.option([h.Value('a')], ['A']), h.option([h.Value('b')], ['B'])],
          )
        }
        return h.div(
          [h.Id('replacement-root')],
          [
            h.span([], ['Inserted']),
            h.div(
              [
                Prop({
                  key: 'foldkitPatchFailure',
                  value: 'fail',
                }),
              ],
              ['Failure'],
            ),
          ],
        )
      }

      const runtime = makeElement({
        Model,
        init: () => ({ model: initialModel(false) }),
        update,
        view: (model: Model) => (model.isEditorShown ? shownView() : h.empty),
        crash: { view: () => h.div([], ['Crashed']) },
        container,
        subscriptions,
        devTools: { show: 'Always', keyframeInterval: 1 },
      })
      const runtimeFiber = Effect.runFork(runtime.start())

      try {
        await vi.waitFor(() => {
          expect(maybeStore).not.toBeNull()
          expect(isSubscriptionReady).toBe(true)
        })
        const store = requireDevToolsStore(maybeStore)

        PubSub.publishUnsafe(subscriptionMessages, Message.ShowedEditor())
        await vi.waitFor(() => {
          expect(document.querySelector('#replacement-root')).not.toBeNull()
        })
        const shownState = await Effect.runPromise(
          SubscriptionRef.get(store.stateRef),
        )
        const shownIndex = latestEntryIndex(shownState)

        PubSub.publishUnsafe(subscriptionMessages, Message.HidEditor())
        await vi.waitFor(() => {
          expect(document.querySelector('#replacement-root')).toBeNull()
        })
        const hiddenState = await Effect.runPromise(
          SubscriptionRef.get(store.stateRef),
        )
        const hiddenIndex = latestEntryIndex(hiddenState)

        if (isPausedBeforeFailure) {
          await Effect.runPromise(store.jumpTo(hiddenIndex))
        }
        isPatchFailureEnabled = true
        const jumpExit = await Effect.runPromise(
          Effect.exit(store.jumpTo(shownIndex)),
        )

        expect(Exit.isFailure(jumpExit)).toBe(true)
        if (!isPausedBeforeFailure) {
          await waitForTwoAnimationFrames()
        }
        const pausedState = await Effect.runPromise(
          SubscriptionRef.get(store.stateRef),
        )
        expect(pausedState.isPaused).toBe(isPausedBeforeFailure)
        if (isPausedBeforeFailure) {
          expect(pausedState.pausedAtIndex).toBe(hiddenIndex)
        }
        expect(document.querySelector('#replacement-root')).toBeNull()
        expect(document.body.textContent).not.toContain('Crashed')

        isPatchFailureEnabled = false
        if (isPausedBeforeFailure) {
          await Effect.runPromise(store.resume)
          await waitForTwoAnimationFrames()
        }
        PubSub.publishUnsafe(subscriptionMessages, Message.ShowedEditor())
        await vi.waitFor(() => {
          expect(document.querySelector('#replacement-root')).not.toBeNull()
        })
      } finally {
        Reflect.deleteProperty(HTMLElement.prototype, 'foldkitPatchFailure')
        Object.defineProperty(
          HTMLSelectElement.prototype,
          'value',
          valueDescriptor,
        )
        await Effect.runPromise(Fiber.interrupt(runtimeFiber))
      }
    },
  )

  it('patches the live view when history eviction auto-resumes', async () => {
    const subscriptionMessages = await Effect.runPromise(
      PubSub.unbounded<Message>(),
    )
    const subscriptions = Subscription.make<Model, Message>()(() => ({
      testMessages: Subscription.persistent(
        Stream.fromPubSub(subscriptionMessages),
      ),
    }))
    const observedViewStates: Array<Mount.ViewState> = []
    const processedTags: Array<Message['_tag']> = []

    const ObserveViewState = Mount.define('ObserveViewState', {
      messages: [Message.CompletedMountEditor],
      execute: ({ viewStateChanges }) =>
        viewStateChanges.pipe(
          Stream.runForEach(viewState =>
            Effect.sync(() => observedViewStates.push(viewState)),
          ),
          Effect.as(Message.CompletedMountEditor()),
        ),
    })
    const mountEditor: Mount.MountAction<Message> = {
      name: 'MountEditor',
      f: () => Stream.never,
    }

    let maybeStore: DevToolsStore | null = null
    __setDevToolsOverlay(store => {
      maybeStore = store
      return Effect.void
    })

    const runtime = makeElement({
      Model,
      init: () => ({ model: initialModel(false) }),
      update: (model: Model, message: Message) => {
        processedTags.push(message._tag)
        return update(model, message)
      },
      view: (model: Model) =>
        h.div([h.OnMount(ObserveViewState())], [modelView(model, mountEditor)]),
      container,
      subscriptions,
      devTools: { show: 'Always', keyframeInterval: 1, maxEntries: 20 },
    })
    const runtimeFiber = Effect.runFork(runtime.start())

    try {
      await vi.waitFor(() => {
        expect(maybeStore).not.toBeNull()
        expect(observedViewStates).toEqual(['Live'])
      })
      const store = requireDevToolsStore(maybeStore)

      PubSub.publishUnsafe(subscriptionMessages, Message.Ticked())
      await waitForBodyText('ticks:1')
      const firstTickState = await Effect.runPromise(
        SubscriptionRef.get(store.stateRef),
      )
      const firstTickIndex = latestEntryIndex(firstTickState)

      await Effect.runPromise(store.jumpTo(firstTickIndex))
      await vi.waitFor(() => {
        expect(observedViewStates).toEqual(['Live', 'Paused'])
      })

      PubSub.publishUnsafe(subscriptionMessages, Message.Ticked())
      await vi.waitFor(async () => {
        expect(
          Array_.filter(processedTags, tag => tag === 'Ticked'),
        ).toHaveLength(2)
        const state = await Effect.runPromise(
          SubscriptionRef.get(store.stateRef),
        )
        expect(state.entries).toHaveLength(2)
      })
      await new Promise<void>(resolve => {
        requestAnimationFrame(() => resolve())
      })
      expect(document.body.textContent).toContain('ticks:1')

      for (let index = 0; index < 19; index += 1) {
        PubSub.publishUnsafe(
          subscriptionMessages,
          Message.CompletedMountEditor(),
        )
      }

      await vi.waitFor(async () => {
        const state = await Effect.runPromise(
          SubscriptionRef.get(store.stateRef),
        )
        expect(state.isPaused).toBe(false)
        expect(observedViewStates).toEqual(['Live', 'Paused', 'Live'])
        expect(document.body.textContent).toContain('ticks:2')
      })
    } finally {
      await Effect.runPromise(Fiber.interrupt(runtimeFiber))
    }
  })

  it('reports only Live when time travel is unavailable', async () => {
    const observedViewStates: Array<Mount.ViewState> = []

    const MountEditor = Mount.define('MountEditor', {
      messages: [Message.CompletedMountEditor],
      execute: ({ element, viewStateChanges }) =>
        Effect.gen(function* () {
          element.setAttribute('data-editor', 'mounted')
          yield* viewStateChanges.pipe(
            Stream.runForEach(viewState =>
              Effect.sync(() => observedViewStates.push(viewState)),
            ),
            Effect.forkScoped,
          )
          return Message.CompletedMountEditor()
        }),
    })

    const runtime = makeElement({
      Model,
      init: () => ({ model: initialModel(true) }),
      update,
      view: model => modelView(model, MountEditor()),
      container,
      devTools: false,
    })
    const runtimeFiber = Effect.runFork(runtime.start())

    try {
      await vi.waitFor(() => {
        expect(observedViewStates).toEqual(['Live'])
      })

      clickButton('hide')
      await vi.waitFor(() => {
        expect(document.querySelector('#editor')).toBeNull()
      })
      expect(observedViewStates).toEqual(['Live'])
    } finally {
      await Effect.runPromise(Fiber.interrupt(runtimeFiber))
    }
  })
})
