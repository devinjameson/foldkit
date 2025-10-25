import { Schema } from 'effect'
import { ts } from 'foldkit/schema'

// MESSAGE - All possible events that can happen in your application
// Messages are dispatched from the view and handled by the update function

// ts is shorthand for Schema.TaggedStruct
const Decrement = ts('Decrement')
const Increment = ts('Increment')
const Reset = ts('Reset')

const Message = Schema.Union(Decrement, Increment, Reset)

type Decrement = typeof Decrement.Type
type Increment = typeof Increment.Type
type Reset = typeof Reset.Type

type Message = typeof Message.Type
