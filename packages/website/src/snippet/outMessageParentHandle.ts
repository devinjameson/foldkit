import { Option } from 'effect'
import { Command } from 'foldkit'
import { evo } from 'foldkit/struct'

export const update = (model: Model, message: Message) =>
  Message.match(message, {
    GotLoginMessage: ({ message }) => {
      const [nextLogin, commands, maybeOutMessage] = Login.update(
        model.login,
        message,
      )

      const mappedCommands = Command.mapMessages(commands, message =>
        Message.GotLoginMessage({ message }),
      )

      return Option.match(maybeOutMessage, {
        onNone: () => [evo(model, { login: () => nextLogin }), mappedCommands],
        onSome: outMessage =>
          Login.OutMessage.match(outMessage, {
            SucceededLogin: ({ sessionId }) => [
              LoggedIn({ sessionId }),
              [...mappedCommands, SaveSession(sessionId)],
            ],
          }),
      })
    },
  })
