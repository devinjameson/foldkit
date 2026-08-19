import { Option } from 'effect'
import { Subscription } from 'foldkit'

import { PressedKey } from './message'
import type { Message } from './message'

export const keyboard = Subscription.fromEventPreventDefault<
  KeyboardEvent,
  Message
>({
  target: document,
  type: 'keydown',
  toMessage: keyboardEvent =>
    Option.some(PressedKey({ key: keyboardEvent.key })),
})
