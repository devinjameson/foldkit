import { evo } from 'foldkit/struct'

type Model = { count: number; lastUpdated: number }
const model: Model = { count: 0, lastUpdated: 0 }

// evo takes the model and an object of transform functions
const newModel = evo(model, {
  count: count => count + 1,
  lastUpdated: () => Date.now(),
})

// Invalid keys are caught at compile time
const badModel = evo(model, {
  counnt: count => count + 1, // ❌ Error: 'counnt' does not exist in Model
})
