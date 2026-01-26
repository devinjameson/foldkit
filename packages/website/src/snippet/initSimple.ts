import { Schema as S } from 'effect'
import type { Runtime } from 'foldkit'
import { ts } from 'foldkit/schema'

const Model = S.Number
type Model = typeof Model.Type

const Increment = ts('Increment')
const Decrement = ts('Decrement')
const Message = S.Union(Increment, Decrement)
type Message = typeof Message.Type

const init: Runtime.ElementInit<Model, Message> = () => [0, []]
