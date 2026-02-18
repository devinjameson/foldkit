import { Array, Effect, Match as M } from 'effect'
import { Runtime } from 'foldkit'
import { evo } from 'foldkit/struct'

export const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Runtime.Command<Message>>] =>
  M.value(message).pipe(
    M.tagsExhaustive({
      SettingsMessage: ({ message }) => {
        const [nextSettings, commands] = Settings.update(
          model.settings,
          message,
        )

        const mappedCommands = Array.map(
          commands,
          Effect.map((message) => SettingsMessage({ message })),
        )

        return [
          evo(model, { settings: () => nextSettings }),
          mappedCommands,
        ]
      },
    }),
  )
