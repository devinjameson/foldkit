import { Match as M, Option } from 'effect'
import { evo } from 'foldkit/struct'

export const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Command<Message>>] =>
  M.value(message).pipe(
    M.tagsExhaustive({
      GotSettingsMessage: ({ message }) => {
        const [nextSettings, commands, maybeOutMessage] =
          Settings.update(model.settings, message)

        return Option.match(maybeOutMessage, {
          onNone: () => [
            evo(model, { settings: () => nextSettings }),
            commands,
          ],
          onSome: outMessage =>
            M.value(outMessage).pipe(
              M.tagsExhaustive({
                RequestedLogout: () => [
                  LoggedOut({ email: '', password: '' }),
                  [...commands, clearSession()],
                ],
              }),
            ),
        })
      },
    }),
  )
