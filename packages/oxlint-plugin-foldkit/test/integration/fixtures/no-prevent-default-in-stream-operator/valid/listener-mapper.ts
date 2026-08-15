import { Option } from 'effect'
import { Subscription } from 'foldkit'

import { OpenedSearch } from './message'
import type { Message } from './message'

// The mapper runs inside the browser's event dispatch, so calling
// `preventDefault` here is in time and must not be flagged.
export const searchShortcut = Subscription.fromEventFilterMap<
  KeyboardEvent,
  Message
>({
  target: window,
  type: 'keydown',
  toMessage: event => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault()
      return Option.some(OpenedSearch())
    }
    return Option.none()
  },
})
