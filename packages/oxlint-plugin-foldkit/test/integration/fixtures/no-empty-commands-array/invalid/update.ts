declare const model: unknown

export const emptyCommands = { model, commands: [] }
export const quotedCommands = { model, 'commands': [] }
export const computedCommands = { model, ['commands']: [] }
export const commentedCommands = {
  model,
  commands: [
    // A comment does not make this a Command.
  ],
}
