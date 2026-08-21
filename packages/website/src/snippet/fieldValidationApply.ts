import { validate } from 'foldkit/fieldValidation'
import { evo } from 'foldkit/struct'

const validateUsername = validate(usernameRules)

const update = (model: Model, message: Message) =>
  Message.match(message, {
    ChangedUsername: ({ value }) => [
      evo(model, {
        username: () => validateUsername(value),
      }),
      [],
    ],
  })
