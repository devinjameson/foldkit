import { Schema as S } from 'effect'
import type { Runtime } from 'foldkit'
import { ts } from 'foldkit/schema'

const Model = S.Number
type Model = typeof Model.Type

const ClickedIncrement = ts('ClickedIncrement')
const ClickedDecrement = ts('ClickedDecrement')
const Message = S.Union(ClickedIncrement, ClickedDecrement)
type Message = typeof Message.Type

const init: Runtime.ElementInit<Model, Message> = () => [0, []]
