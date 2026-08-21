import { Command } from 'foldkit'
import { evo } from 'foldkit/struct'

export const update = (model: Model, message: Message) =>
  Message.match(message, {
    GotSettingsMessage: ({ message }) => {
      const [nextSettings, commands] = Settings.update(model.settings, message)

      const mappedCommands = Command.mapMessages(commands, message =>
        GotSettingsMessage({ message }),
      )

      return [evo(model, { settings: () => nextSettings }), mappedCommands]
    },
  })
