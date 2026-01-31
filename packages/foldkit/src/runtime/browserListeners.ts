import {
  Effect,
  Function,
  Option,
  Queue,
  Ref,
  Runtime,
  String,
  pipe,
} from 'effect'

import { OptionExt, StringExt } from '../effectExtensions'
import { Url } from '../url'
import { VNode } from '../vdom'
import { BrowserConfig } from './runtime'
import { External, Internal } from './urlRequest'

export const addNavigationEventListeners = <Message>(
  messageQueue: Queue.Queue<Message>,
  browserConfig: BrowserConfig<Message>,
) => {
  addPopStateListener(messageQueue, browserConfig)
  addLinkClickListener(messageQueue, browserConfig)
  addProgrammaticNavigationListener(messageQueue, browserConfig)
}

const addPopStateListener = <Message>(
  messageQueue: Queue.Queue<Message>,
  browserConfig: BrowserConfig<Message>,
) => {
  const onPopState = () => {
    Queue.unsafeOffer(messageQueue, browserConfig.onUrlChange(locationToUrl()))
  }

  window.addEventListener('popstate', onPopState)
}

const addLinkClickListener = <Message>(
  messageQueue: Queue.Queue<Message>,
  browserConfig: BrowserConfig<Message>,
) => {
  const onLinkClick = (event: Event) => {
    const target = event.target
    if (!target || !('closest' in target)) {
      return
    }

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const maybeLink = Option.fromNullable((target as Element).closest('a'))
    if (Option.isNone(maybeLink)) {
      return
    }

    const { href } = maybeLink.value
    if (String.isEmpty(href)) {
      return
    }

    event.preventDefault()

    const linkUrl = new URL(href)
    const currentUrl = new URL(window.location.href)

    if (linkUrl.origin !== currentUrl.origin) {
      Queue.unsafeOffer(
        messageQueue,
        browserConfig.onUrlRequest(External.make({ href })),
      )
      return
    }

    Queue.unsafeOffer(
      messageQueue,
      browserConfig.onUrlRequest(
        Internal.make({ url: urlToFoldkitUrl(linkUrl) }),
      ),
    )
  }

  document.addEventListener('click', onLinkClick)
}

const addProgrammaticNavigationListener = <Message>(
  messageQueue: Queue.Queue<Message>,
  browserConfig: BrowserConfig<Message>,
) => {
  const onProgrammaticNavigation = () => {
    Queue.unsafeOffer(messageQueue, browserConfig.onUrlChange(locationToUrl()))
  }

  window.addEventListener('foldkit:urlchange', onProgrammaticNavigation)
}

const urlToFoldkitUrl = (url: URL): Url => {
  const { protocol, hostname, port, pathname, search, hash } = url

  return {
    protocol,
    host: hostname,
    port: OptionExt.fromString(port),
    pathname,
    search: StringExt.stripPrefixNonEmpty('?')(search),
    hash: StringExt.stripPrefixNonEmpty('#')(hash),
  }
}

const locationToUrl = (): Url => urlToFoldkitUrl(new URL(window.location.href))

export const addBfcacheRestoreListener = <Model>(config: {
  runtimeRef: Ref.Ref<Option.Option<Runtime.Runtime<never>>>
  vnodeRef: Ref.Ref<Option.Option<VNode>>
  modelRef: Ref.Ref<Model>
  render: (model: Model) => Effect.Effect<void>
}) => {
  window.addEventListener(
    'pageshow',
    ({ persisted: isRestoredFromBfcache }) => {
      if (isRestoredFromBfcache) {
        pipe(
          config.runtimeRef,
          Ref.get,
          Effect.runSync,
          Option.match({
            onNone: Function.constVoid,
            onSome: (runtime) =>
              Runtime.runSync(runtime)(
                Effect.gen(function* () {
                  yield* Ref.set(config.vnodeRef, Option.none())
                  const model = yield* Ref.get(config.modelRef)
                  yield* config.render(model)
                }),
              ),
          }),
        )
      }
    },
  )
}
