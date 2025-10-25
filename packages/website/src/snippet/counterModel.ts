import { Schema } from 'effect'

// MODEL - The shape of your application state
// In this case, our state is just a number representing the count

const Model = Schema.Number
type Model = typeof Model.Type
