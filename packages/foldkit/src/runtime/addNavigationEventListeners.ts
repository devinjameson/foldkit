import { Array, Queue, String, pipe } from 'effect'

import { External, Internal, Url } from '../urlRequest'
import { BrowserConfig } from './runtime'

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
    const newUrl: Url = {
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
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

      const queryAndHash = Array.tailNonEmpty(parts)

      const pathname = pipe(path, String.split('#'), Array.headNonEmpty)

      const queryPart = Array.isNonEmptyArray(queryAndHash) ? Array.headNonEmpty(queryAndHash) : ''

      const search = pipe(queryPart, String.split('#'), Array.headNonEmpty, (q) =>
        String.isEmpty(q) ? '' : `?${q}`,
      )

      const hash = pipe(href, String.split('#'), (hashParts) =>
        Array.isNonEmptyArray(hashParts) && hashParts.length > 1 ? `#${hashParts[1]}` : '',
      )

      return { pathname, search, hash }
    })

    const isSamePageHashLink =
      url.hash && (url.pathname === window.location.pathname || href.startsWith('#'))

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
    const newUrl: Url = {
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
    }
    Queue.unsafeOffer(messageQueue, browserConfig.onUrlChange(newUrl))
  }

  window.addEventListener('foldkit:urlchange', onProgrammaticNavigation)
}
