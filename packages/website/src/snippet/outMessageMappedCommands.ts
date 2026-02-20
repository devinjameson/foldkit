import { Array, Effect } from 'effect'

const [nextSettings, commands, maybeOutMessage] = Settings.update(
  model.settings,
  message,
)

const mappedCommands = Array.map(commands, (command) =>
  Effect.map(command, (message) => GotSettingsMessage({ message })),
)
