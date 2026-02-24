import { Match as M } from 'effect'
import { Command } from 'foldkit/command'

export const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Command<Message>>] =>
  M.value(message).pipe(
    M.tagsExhaustive({
      ClickedLogin: () => [
        LoggedIn({ userId: '123', username: 'alice' }),
        [],
      ],
      ClickedLogout: () => [
        LoggedOut({ email: '', password: '' }),
        [],
      ],
    }),
  )
