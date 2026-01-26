import { Task } from 'foldkit'

// Focus an element after form submission
const focusCommand = Task.focus('#email-input', (success) =>
  InputFocused.make({ success }),
)

// Generate a random integer between 1 and 6 (dice roll)
const randomCommand = Task.randomInt(1, 7, (value) =>
  DiceRolled.make({ value }),
)
