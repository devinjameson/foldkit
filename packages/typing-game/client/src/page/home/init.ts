import { Option } from 'effect'
import { Runtime, Task } from 'foldkit'

import { USERNAME_INPUT_ID } from '../../constant'
import { Message, NoOp } from './message'
import { EnterUsername, Model } from './model'

export type InitReturn = [Model, ReadonlyArray<Runtime.Command<Message>>]

export const init = (): InitReturn => [
  {
    homeStep: EnterUsername({ username: '' }),
    formError: Option.none(),
  },
  [Task.focus(`#${USERNAME_INPUT_ID}`, () => NoOp())],
]
