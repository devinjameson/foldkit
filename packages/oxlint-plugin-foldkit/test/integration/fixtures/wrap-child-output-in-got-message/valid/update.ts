import { Update } from 'foldkit'
import { Option } from 'effect'
import { evo } from 'foldkit/struct'
import { Child } from './child'
import { GotChildMessage } from './message'
import { Model } from './model'

// UPDATE

export const update = Update.foldChild({
  update: Child.update,
  read: (model: Model) => Option.some(model.child),
  write: (model, nextChild) => evo(model, { child: () => nextChild }),
  toParentMessage: message => GotChildMessage({ message }),
})
