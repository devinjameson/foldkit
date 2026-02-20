import { Schema } from 'effect'
import { m } from 'foldkit/schema'

// MESSAGE - All possible events that can happen in your application
// Messages are dispatched from the view and handled by the update function

// m wraps Schema.TaggedStruct with a callable constructor — write Foo() instead of Foo.make()
const ClickedDecrement = m('ClickedDecrement')
const ClickedIncrement = m('ClickedIncrement')
const ClickedReset = m('ClickedReset')

const Message = Schema.Union(
  ClickedDecrement,
  ClickedIncrement,
  ClickedReset,
)
type Message = typeof Message.Type
