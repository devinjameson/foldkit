import { Option, Schema as S } from 'effect'
import type { Runtime } from 'foldkit'
import { ts } from 'foldkit/schema'

const Model = S.Struct({
  count: S.Number,
  startingCount: S.Option(S.Number),
})
type Model = typeof Model.Type

const Flags = S.Struct({
  savedCount: S.Option(S.Number),
})
type Flags = typeof Flags.Type

const Increment = ts('Increment')
const Message = S.Union(Increment)
type Message = typeof Message.Type

const init: Runtime.ElementInit<Model, Message, Flags> = (flags) => [
  {
    count: Option.getOrElse(flags.savedCount, () => 0),
    startingCount: flags.savedCount,
  },
  [],
]
