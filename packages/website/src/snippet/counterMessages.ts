import { Schema } from 'effect'
import { ts } from 'foldkit/schema'

// MESSAGE - All possible events that can happen in your application
// Messages are dispatched from the view and handled by the update function

// ts is shorthand for Schema.TaggedStruct
const ClickedDecrement = ts('ClickedDecrement')
const ClickedIncrement = ts('ClickedIncrement')
const ClickedReset = ts('ClickedReset')

const Message = Schema.Union(
  ClickedDecrement,
  ClickedIncrement,
  ClickedReset,
)
type Message = typeof Message.Type
