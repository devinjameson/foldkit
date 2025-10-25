import { Option, Queue, String } from 'effect'

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
      Queue.unsafeOffer(messageQueue, browserConfig.onUrlRequest(External.make({ href })))
      return
    }

    const { protocol, host, port, pathname, search, hash } = linkUrl

    const url: Url = {
      protocol,
      host,
      port: OptionExt.fromString(port),
      pathname,
      search: StringExt.stripPrefixNonEmpty('?')(search),
      hash: StringExt.stripPrefixNonEmpty('#')(hash),
    }

    Queue.unsafeOffer(messageQueue, browserConfig.onUrlRequest(Internal.make({ url })))
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

    const {
      location: { protocol, host, port, pathname },
    } = window

    const newUrl: Url = {
      protocol,
      host,
      port: OptionExt.fromString(port),
      pathname,
      search,
      hash,
    }
    Queue.unsafeOffer(messageQueue, browserConfig.onUrlChange(newUrl))
  }

  window.addEventListener('foldkit:urlchange', onProgrammaticNavigation)
}
