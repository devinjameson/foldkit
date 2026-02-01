import { Match } from 'effect'

import { Message } from './message'
import { Model } from './model'

// ❌ Don't do this in update
const update = (model: Model, message: Message) =>
  Match.value(message).pipe(
    Match.tagsExhaustive({
      FetchUserClicked: () => {
        // Making HTTP requests directly
        fetch('/api/user').then((res) => {
          model.user = res.json() // Mutating state!
        })
        return [model, []]
      },
    }),
  )
