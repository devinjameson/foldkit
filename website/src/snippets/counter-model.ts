import { Schema } from 'effect'
import { ST } from 'foldkit/schema'

// MODEL - The shape of your application state
// In this case, our state is just a number representing the count

const Model = Schema.Number
// ST is shorthand for Schema.Schema.Type
type Model = ST<typeof Model>
