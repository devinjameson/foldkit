import { Struct } from 'effect'
import { evo } from 'foldkit/struct'

const obj = {
  name: 'John',
  age: 30,
}

// Curried function
const addSuffix = (suffix: string) => (s: string) => s + suffix

// Test with Struct.evolve
const result1 = Struct.evolve(obj, {
  name: addSuffix('!'),
})

// Test with our evo
const result2 = evo(obj, {
  name: addSuffix('!'),
})
