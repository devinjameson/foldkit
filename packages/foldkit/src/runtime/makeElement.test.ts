import {
  Effect,
  Fiber,
  Function,
  Match as M,
  Number,
  Schema as S,
} from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Command } from '../command/index.js'
import { TextDirection, __htmlBuilder } from '../html/index.js'
import { m } from '../message/index.js'
import { evo } from '../struct/index.js'
import {
  __setDevToolsOverlay,
  __startProgram,
  makeApplication,
  makeElement,
} from './runtime.js'

const Rendered = m('Rendered')
const ClickedBump = m('ClickedBump')
const Message = S.Union([Rendered, ClickedBump])
type Message = typeof Message.Type

const Model = S.Struct({ label: S.String })
type Model = typeof Model.Type

const h = __htmlBuilder<Message>()

const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<readonly [Model, ReadonlyArray<Command<Message>>]>(),
    M.tagsExhaustive({
      Rendered: () => [model, []],
      ClickedBump: () => [{ label: 'world' }, []],
    }),
  )

const LocaleModel = S.Struct({
  lang: S.String,
  dir: TextDirection,
  revision: S.Number,
})
type LocaleModel = typeof LocaleModel.Type

const ENGLISH_LTR = LocaleModel.make({ lang: 'en', dir: 'Ltr', revision: 0 })
const FRENCH_AUTO = LocaleModel.make({
  lang: 'fr-CA',
  dir: 'Auto',
  revision: 0,
})

const ClickedArabic = m('ClickedArabic')
const ClickedRerender = m('ClickedRerender')
const LocaleMessage = S.Union([ClickedArabic, ClickedRerender])
type LocaleMessage = typeof LocaleMessage.Type

const localeH = __htmlBuilder<LocaleMessage>()

const localeUpdate = (
  model: LocaleModel,
  message: LocaleMessage,
): readonly [LocaleModel, ReadonlyArray<Command<LocaleMessage>>] =>
  M.value(message).pipe(
    M.withReturnType<
      readonly [LocaleModel, ReadonlyArray<Command<LocaleMessage>>]
    >(),
    M.tagsExhaustive({
      ClickedArabic: () => [
        evo(model, { lang: () => 'ar', dir: () => 'Rtl' }),
        [],
      ],
      ClickedRerender: () => [evo(model, { revision: Number.increment }), []],
    }),
  )

const HOST_TITLE = 'Host Page Title'
const HOST_LANG = 'en'

let container: HTMLElement

const removeHeadMetadata = (): void => {
  document.head.querySelectorAll('link[rel="canonical"]').forEach(node => {
    node.remove()
  })
  document.head.querySelectorAll('meta[property="og:url"]').forEach(node => {
    node.remove()
  })
}

const resetRootAttributes = (): void => {
  document.documentElement.lang = HOST_LANG
  document.documentElement.removeAttribute('dir')
}

beforeEach(() => {
  document.title = HOST_TITLE
  removeHeadMetadata()
  resetRootAttributes()
  container = document.createElement('div')
  container.id = 'app'
  document.body.appendChild(container)
})

afterEach(() => {
  __setDevToolsOverlay(undefined)
  document.body.innerHTML = ''
  document.title = HOST_TITLE
  removeHeadMetadata()
  resetRootAttributes()
})

const awaitBodyText = (text: string): Promise<void> =>
  vi.waitFor(() => {
    expect(document.body.textContent).toContain(text)
  })

const expectDocumentUntouched = (): void => {
  expect(document.title).toBe(HOST_TITLE)
  expect(document.head.querySelector('link[rel="canonical"]')).toBeNull()
  expect(document.head.querySelector('meta[property="og:url"]')).toBeNull()
  expect(document.documentElement.lang).toBe(HOST_LANG)
  expect(document.documentElement.hasAttribute('dir')).toBe(false)
}

const expectStartRejected = async (
  effect: Effect.Effect<void>,
  message: string,
): Promise<void> => {
  await expect(
    Effect.runPromise(effect.pipe(Effect.timeout('250 millis'))),
  ).rejects.toThrow(message)
}

describe('makeElement', () => {
  it('mounts a registered DevTools overlay when DevTools are active', async () => {
    const mountedOverlays: Array<string> = []
    __setDevToolsOverlay(() => {
      mountedOverlays.push('registered')
      return Effect.void
    })

    const element = makeElement({
      Model,
      init: () => [{ label: 'hello' }, []],
      update,
      view: model => h.div([], [model.label]),
      container,
      devTools: { show: 'Always' },
    })

    const fiber = Effect.runFork(element.start())

    try {
      await vi.waitFor(() => {
        expect(mountedOverlays).toEqual(['registered'])
      })
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('renders into its container without touching the document head', async () => {
    const element = makeElement({
      Model,
      init: () => [{ label: 'hello' }, []],
      update,
      view: model => h.div([], [model.label]),
      container,
    })

    const fiber = Effect.runFork(element.start())

    try {
      await awaitBodyText('hello')
      expectDocumentUntouched()
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('renders in a connected shadow root from the current document', async () => {
    const host = document.createElement('div')
    const shadowRoot = host.attachShadow({ mode: 'open' })
    const shadowContainer = document.createElement('div')
    shadowContainer.id = 'shadow-app'
    shadowRoot.appendChild(shadowContainer)
    document.body.appendChild(host)

    const element = makeElement({
      Model,
      init: () => [{ label: 'inside-shadow' }, []],
      update,
      view: model => h.div([], [model.label]),
      container: shadowContainer,
    })

    const fiber = Effect.runFork(element.start())
    try {
      await vi.waitFor(() => {
        expect(shadowRoot.textContent).toContain('inside-shadow')
      })
      expectDocumentUntouched()
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('rejects a detached container', async () => {
    const detached = document.createElement('div')
    detached.id = 'detached-element'
    const element = makeElement({
      Model,
      init: () => [{ label: 'never-started' }, []],
      update,
      view: model => h.div([], [model.label]),
      container: detached,
    })

    await expectStartRejected(element.start(), 'received a detached container')
  })

  it('rejects a foreign-document container', async () => {
    const otherDocument = document.implementation.createHTMLDocument('other')
    const foreign = otherDocument.createElement('div')
    foreign.id = 'foreign-element'
    otherDocument.body.appendChild(foreign)
    const element = makeElement({
      Model,
      init: () => [{ label: 'never-started' }, []],
      update,
      view: model => h.div([], [model.label]),
      container: foreign,
    })

    await expectStartRejected(element.start(), 'owned by another document')
  })

  it('leaves the document head untouched across re-renders', async () => {
    const element = makeElement({
      Model,
      init: () => [{ label: 'hello' }, []],
      update,
      view: model =>
        h.div(
          [],
          [h.button([h.OnClick(ClickedBump())], ['bump']), model.label],
        ),
      container,
    })

    const fiber = Effect.runFork(element.start())

    try {
      await awaitBodyText('hello')

      const button = document.body.querySelector('button')
      expect(button).not.toBeNull()
      button?.click()

      await awaitBodyText('world')
      expectDocumentUntouched()
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('seeds the initial model from flags', async () => {
    const Flags = S.Struct({ initialLabel: S.String })

    const element = makeElement({
      Model,
      Flags,
      flags: Effect.succeed({ initialLabel: 'from-flags' }),
      init: flags => [{ label: flags.initialLabel }, []],
      update,
      view: model => h.div([], [model.label]),
      container,
    })

    const fiber = Effect.runFork(element.start())

    try {
      await awaitBodyText('from-flags')
      expectDocumentUntouched()
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('renders a scoped crash view without touching the document head', async () => {
    const element = makeElement({
      Model,
      init: () => [{ label: 'hello' }, []],
      update,
      view: () => {
        throw new Error('boom from view')
      },
      crash: {
        view: () => h.div([], ['Crashed Widget']),
      },
      container,
    })

    const fiber = Effect.runFork(element.start())

    try {
      await awaitBodyText('Crashed Widget')
      expectDocumentUntouched()
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })
})

describe('makeApplication', () => {
  it('owns the document head, applying title and canonical metadata', async () => {
    const application = makeApplication({
      Model,
      init: () => [{ label: 'hello' }, []],
      update,
      view: model => ({ title: model.label, body: h.div([], [model.label]) }),
      container,
    })

    const fiber = Effect.runFork(application.start())

    try {
      await awaitBodyText('hello')

      expect(document.title).toBe('hello')
      expect(
        document.head.querySelector('link[rel="canonical"]'),
      ).not.toBeNull()
      expect(
        document.head.querySelector('meta[property="og:url"]'),
      ).not.toBeNull()
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('refuses a second active page owner before init and leaves the first interactive', async () => {
    let secondInitCount = 0

    const first = makeApplication({
      Model,
      init: () => [{ label: 'first' }, []],
      update,
      view: model => ({
        title: model.label,
        body: h.div(
          [],
          [h.button([h.OnClick(ClickedBump())], ['bump']), model.label],
        ),
      }),
      container,
    })
    const second = makeApplication({
      Model,
      init: () => {
        secondInitCount += 1
        return [{ label: 'second' }, []]
      },
      update,
      view: model => ({ title: model.label, body: h.div([], [model.label]) }),
      container,
    })

    const firstFiber = Effect.runFork(first.start())
    try {
      await awaitBodyText('first')
      await expectStartRejected(
        second.start(),
        'already has an active page-owning application',
      )

      const lateContainer = document.createElement('div')
      lateContainer.id = 'late-app'
      document.body.appendChild(lateContainer)
      const late = makeApplication({
        Model,
        init: () => [{ label: 'late' }, []],
        update,
        view: model => ({
          title: model.label,
          body: h.div([], [model.label]),
        }),
        container: lateContainer,
      })
      await expectStartRejected(
        late.start(),
        'already has an active page-owning application',
      )

      expect(secondInitCount).toBe(0)
      expect(document.title).toBe('first')
      expect(document.body.hasAttribute('data-foldkit-refused')).toBe(false)
      expect(container.isConnected).toBe(false)

      document.body.querySelector('button')?.click()
      await awaitBodyText('world')
      expect(document.title).toBe('world')
    } finally {
      await Effect.runPromise(Fiber.interrupt(firstFiber))
    }
  })

  it('refuses a second execution of the same start Effect', async () => {
    const application = makeApplication({
      Model,
      init: () => [{ label: 'one-owner' }, []],
      update,
      view: model => ({ title: model.label, body: h.div([], [model.label]) }),
      container,
    })
    const start = application.start()
    const firstFiber = Effect.runFork(start)

    try {
      await awaitBodyText('one-owner')
      await expectStartRejected(
        start,
        'already has an active page-owning application',
      )
      expect(document.title).toBe('one-owner')
    } finally {
      await Effect.runPromise(Fiber.interrupt(firstFiber))
    }
  })

  it('releases page ownership after the runtime finishes cleanup', async () => {
    const secondContainer = document.createElement('div')
    secondContainer.id = 'next-app'
    document.body.appendChild(secondContainer)

    const first = makeApplication({
      Model,
      init: () => [{ label: 'first-owner' }, []],
      update,
      view: model => ({ title: model.label, body: h.div([], [model.label]) }),
      container,
    })
    const second = makeApplication({
      Model,
      init: () => [{ label: 'next-owner' }, []],
      update,
      view: model => ({ title: model.label, body: h.div([], [model.label]) }),
      container: secondContainer,
    })

    const firstFiber = Effect.runFork(first.start())
    await awaitBodyText('first-owner')
    await Effect.runPromise(Fiber.interrupt(firstFiber))

    const secondFiber = Effect.runFork(second.start())
    try {
      await awaitBodyText('next-owner')
      expect(document.title).toBe('next-owner')
    } finally {
      await Effect.runPromise(Fiber.interrupt(secondFiber))
    }
  })

  it('keeps page ownership until runtime cleanup finishes', async () => {
    let isCleanupRegistered = false
    let markCleanupStarted = Function.constVoid
    let finishCleanup = Function.constVoid
    const cleanupStarted = new Promise<void>(resolve => {
      markCleanupStarted = resolve
    })
    const cleanupGate = new Promise<void>(resolve => {
      finishCleanup = resolve
    })
    const StartupFlags = S.Struct({ label: S.String })
    const flags = Effect.acquireRelease(
      Effect.sync(() => {
        isCleanupRegistered = true
        return { label: 'cleaning-up' }
      }),
      () =>
        Effect.sync(markCleanupStarted).pipe(
          Effect.andThen(Effect.promise(() => cleanupGate)),
        ),
    )
    const secondContainer = document.createElement('div')
    secondContainer.id = 'after-cleanup'
    document.body.appendChild(secondContainer)
    const first = makeApplication({
      Model,
      Flags: StartupFlags,
      init: ({ label }) => [{ label }, []],
      update,
      view: model => ({
        title: model.label,
        body: h.div([], [model.label]),
      }),
      container,
    })
    const second = makeApplication({
      Model,
      init: () => [{ label: 'after-cleanup' }, []],
      update,
      view: model => ({ title: model.label, body: h.div([], [model.label]) }),
      container: secondContainer,
    })

    const firstFiber = Effect.runFork(
      __startProgram(first, undefined, 'Fresh', flags),
    )
    await awaitBodyText('cleaning-up')
    await vi.waitFor(() => {
      expect(isCleanupRegistered).toBe(true)
    })

    const interrupted = Effect.runPromise(Fiber.interrupt(firstFiber))
    await cleanupStarted
    try {
      await expectStartRejected(
        second.start(),
        'already has an active page-owning application',
      )
    } finally {
      finishCleanup()
      await interrupted
    }

    const secondFiber = Effect.runFork(second.start())
    try {
      await awaitBodyText('after-cleanup')
    } finally {
      await Effect.runPromise(Fiber.interrupt(secondFiber))
    }
  })

  it('rejects containers outside the current body light DOM', async () => {
    const headContainer = document.createElement('div')
    headContainer.id = 'head-app'
    document.head.appendChild(headContainer)
    const host = document.createElement('div')
    const shadowRoot = host.attachShadow({ mode: 'open' })
    const shadowContainer = document.createElement('div')
    shadowContainer.id = 'shadow-page-app'
    shadowRoot.appendChild(shadowContainer)
    document.body.appendChild(host)
    document.body.id = 'body-app'

    try {
      for (const invalidContainer of [
        document.body,
        headContainer,
        shadowContainer,
      ]) {
        const application = makeApplication({
          Model,
          init: () => [{ label: 'never-started' }, []],
          update,
          view: model => ({
            title: model.label,
            body: h.div([], [model.label]),
          }),
          container: invalidContainer,
        })

        await expectStartRejected(
          application.start(),
          'must start in a container under the current document body light DOM',
        )
      }
    } finally {
      document.body.removeAttribute('id')
      headContainer.remove()
    }
  })

  it('rejects detached and foreign-document containers', async () => {
    const detached = document.createElement('div')
    detached.id = 'detached-application'
    const otherDocument = document.implementation.createHTMLDocument('other')
    const foreign = otherDocument.createElement('div')
    foreign.id = 'foreign-application'
    otherDocument.body.appendChild(foreign)

    for (const [invalidContainer, message] of [
      [detached, 'received a detached container'],
      [foreign, 'owned by another document'],
    ] satisfies ReadonlyArray<readonly [HTMLElement, string]>) {
      const application = makeApplication({
        Model,
        init: () => [{ label: 'never-started' }, []],
        update,
        view: model => ({ title: model.label, body: h.div([], [model.label]) }),
        container: invalidContainer,
      })

      await expectStartRejected(application.start(), message)
    }
  })

  it('rechecks the container when it moves after configuration', async () => {
    const application = makeApplication({
      Model,
      init: () => [{ label: 'never-started' }, []],
      update,
      view: model => ({ title: model.label, body: h.div([], [model.label]) }),
      container,
    })
    container.remove()

    await expectStartRejected(
      application.start(),
      'received a detached container',
    )
    expect(document.body.hasAttribute('data-foldkit-refused')).toBe(false)
  })

  it('reuses metadata elements and reasserts externally changed values', async () => {
    const canonicalUrl = 'https://example.com/todos'
    const application = makeApplication({
      Model,
      init: () => [{ label: 'hello' }, []],
      update,
      view: model => ({
        title: model.label,
        canonical: canonicalUrl,
        ogUrl: canonicalUrl,
        body: h.div(
          [],
          [h.button([h.OnClick(ClickedBump())], ['bump']), model.label],
        ),
      }),
      container,
    })

    const fiber = Effect.runFork(application.start())

    try {
      await awaitBodyText('hello')
      const canonical = document.head.querySelector('link[rel="canonical"]')
      const ogUrl = document.head.querySelector('meta[property="og:url"]')
      const button = document.body.querySelector('button')
      expect(canonical).toBeInstanceOf(HTMLLinkElement)
      expect(ogUrl).toBeInstanceOf(HTMLMetaElement)
      expect(button).not.toBeNull()
      if (
        !(canonical instanceof HTMLLinkElement) ||
        !(ogUrl instanceof HTMLMetaElement) ||
        button === null
      ) {
        throw new Error('expected application metadata and button')
      }

      const querySelectorSpy = vi.spyOn(document.head, 'querySelector')
      const canonicalSetAttributeSpy = vi.spyOn(canonical, 'setAttribute')
      const ogUrlSetAttributeSpy = vi.spyOn(ogUrl, 'setAttribute')
      try {
        button.click()
        await awaitBodyText('world')

        expect(querySelectorSpy).not.toHaveBeenCalled()
        expect(canonicalSetAttributeSpy).not.toHaveBeenCalled()
        expect(ogUrlSetAttributeSpy).not.toHaveBeenCalled()

        canonical.setAttribute('href', 'https://example.com/changed')
        ogUrl.setAttribute('content', 'https://example.com/changed')
        canonicalSetAttributeSpy.mockClear()
        ogUrlSetAttributeSpy.mockClear()

        button.click()
        await vi.waitFor(() => {
          expect(canonical.getAttribute('href')).toBe(canonicalUrl)
          expect(ogUrl.getAttribute('content')).toBe(canonicalUrl)
        })

        expect(querySelectorSpy).not.toHaveBeenCalled()
        expect(canonicalSetAttributeSpy).toHaveBeenCalledWith(
          'href',
          canonicalUrl,
        )
        expect(ogUrlSetAttributeSpy).toHaveBeenCalledWith(
          'content',
          canonicalUrl,
        )
      } finally {
        querySelectorSpy.mockRestore()
        canonicalSetAttributeSpy.mockRestore()
        ogUrlSetAttributeSpy.mockRestore()
      }
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('applies lang and dir to the html element', async () => {
    const application = makeApplication({
      Model: LocaleModel,
      init: () => [FRENCH_AUTO, []],
      update: localeUpdate,
      view: model => ({
        title: 'Localized',
        lang: model.lang,
        dir: model.dir,
        body: localeH.div([], ['bonjour']),
      }),
      container,
    })

    const fiber = Effect.runFork(application.start())

    try {
      await awaitBodyText('bonjour')

      expect(document.documentElement.lang).toBe('fr-CA')
      expect(document.documentElement.dir).toBe('auto')
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('leaves lang and dir alone when the view omits them', async () => {
    const application = makeApplication({
      Model,
      init: () => [{ label: 'hello' }, []],
      update,
      view: model => ({ title: model.label, body: h.div([], [model.label]) }),
      container,
    })

    const fiber = Effect.runFork(application.start())

    try {
      await awaitBodyText('hello')

      expect(document.documentElement.lang).toBe(HOST_LANG)
      expect(document.documentElement.hasAttribute('dir')).toBe(false)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('applies lang without touching dir when the view sets only one', async () => {
    const application = makeApplication({
      Model,
      init: () => [{ label: 'hello' }, []],
      update,
      view: model => ({
        title: model.label,
        lang: 'ja',
        body: h.div([], [model.label]),
      }),
      container,
    })

    const fiber = Effect.runFork(application.start())

    try {
      await awaitBodyText('hello')

      expect(document.documentElement.lang).toBe('ja')
      expect(document.documentElement.hasAttribute('dir')).toBe(false)
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('tracks lang and dir across renders, and reasserts them on a later render that leaves both unchanged', async () => {
    const application = makeApplication({
      Model: LocaleModel,
      init: () => [ENGLISH_LTR, []],
      update: localeUpdate,
      view: model => ({
        title: 'Localized',
        lang: model.lang,
        dir: model.dir,
        body: localeH.div(
          [],
          [
            localeH.button([localeH.OnClick(ClickedArabic())], ['arabic']),
            localeH.button([localeH.OnClick(ClickedRerender())], ['rerender']),
            `${model.lang}-${model.revision}`,
          ],
        ),
      }),
      container,
    })

    const fiber = Effect.runFork(application.start())

    try {
      await awaitBodyText('en-0')
      expect(document.documentElement.lang).toBe('en')
      expect(document.documentElement.dir).toBe('ltr')

      const buttons = document.body.querySelectorAll('button')
      const arabicButton = buttons.item(0)
      const rerenderButton = buttons.item(1)
      if (arabicButton === null || rerenderButton === null) {
        throw new Error('expected the arabic and rerender buttons')
      }

      arabicButton.click()
      await awaitBodyText('ar-0')
      expect(document.documentElement.lang).toBe('ar')
      expect(document.documentElement.dir).toBe('rtl')

      document.documentElement.lang = 'de'
      document.documentElement.dir = 'ltr'

      rerenderButton.click()
      await awaitBodyText('ar-1')
      expect(document.documentElement.lang).toBe('ar')
      expect(document.documentElement.dir).toBe('rtl')
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })
})
