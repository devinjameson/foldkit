import { Array, Option, Queue, String, pipe } from 'effect'

import { OptionExt, StringExt } from '../effectExtensions'
import { Url } from '../url'
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
    const search = StringExt.stripPrefixNonEmpty('?')(window.location.search)
    const hash = StringExt.stripPrefixNonEmpty('#')(window.location.hash)

    const newUrl: Url = {
      protocol: window.location.protocol,
      host: window.location.host,
      port: OptionExt.fromString(window.location.port),
      pathname: window.location.pathname,
      search,
      hash,
    }
    Queue.unsafeOffer(messageQueue, browserConfig.onUrlChange(newUrl))
  }

  window.addEventListener('popstate', onPopState)
}

const addLinkClickListener = <Message>(
  messageQueue: Queue.Queue<Message>,
  browserConfig: BrowserConfig<Message>,
) => {
  const onLinkClick = (event: Event) => {
    const target = event.target
    if (!target || !('closest' in target)) return

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const link = (target as Element).closest('a')
    if (!link) return

    const href = link.getAttribute('href')
    if (!href) return

    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) {
      Queue.unsafeOffer(messageQueue, browserConfig.onUrlRequest(External.make({ href })))
      return
    }

    const url: Url = pipe(href, String.split('?'), (parts) => {
      const path = Array.headNonEmpty(parts)
      const searchAndHash = Array.tailNonEmpty(parts)
      const pathname = pipe(path, String.split('#'), Array.headNonEmpty) || '/'
      const searchPart = Array.head(searchAndHash).pipe(
        Option.match({
          onNone: () => '',
          onSome: (s) => s,
        }),
      )
      const search = pipe(searchPart, String.split('#'), Array.headNonEmpty, OptionExt.fromString)

      const hash = pipe(
        href,
        String.split('#'),
        (hashParts) =>
          Array.isNonEmptyArray(hashParts) && hashParts.length > 1 ? hashParts[1]! : '',
        OptionExt.fromString,
      )

      return {
        protocol: window.location.protocol,
        host: window.location.host,
        port: OptionExt.fromString(window.location.port),
        pathname,
        search,
        hash,
      }
    })

    const isSamePageHashLink =
      Option.isSome(url.hash) && (url.pathname === window.location.pathname || href.startsWith('#'))

    if (!isSamePageHashLink) {
      event.preventDefault()
      Queue.unsafeOffer(messageQueue, browserConfig.onUrlRequest(Internal.make({ url })))
    }
  }

  document.addEventListener('click', onLinkClick)
}

const addProgrammaticNavigationListener = <Message>(
  messageQueue: Queue.Queue<Message>,
  browserConfig: BrowserConfig<Message>,
) => {
  const onProgrammaticNavigation = () => {
    const search = StringExt.stripPrefixNonEmpty('?')(window.location.search)
    const hash = StringExt.stripPrefixNonEmpty('#')(window.location.hash)

    const newUrl: Url = {
      protocol: window.location.protocol,
      host: window.location.host,
      port: OptionExt.fromString(window.location.port),
      pathname: window.location.pathname,
      search,
      hash,
    }
    Queue.unsafeOffer(messageQueue, browserConfig.onUrlChange(newUrl))
  }

  window.addEventListener('foldkit:urlchange', onProgrammaticNavigation)
}
