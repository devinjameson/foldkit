import { Match, Option } from 'effect'
import { Update } from 'foldkit'
import { evo } from 'foldkit/struct'

const toParentDialogOutMessage = Match.type<Dialog.OutMessage>().pipe(
  Match.withReturnType<OutMessage | undefined>(),
  Match.tagsExhaustive({
    Opened: () => undefined,
    Closed: () => OutMessage.ClosedDialog(),
  }),
)

const foldDialogClose = Update.foldChildStep({
  update: Dialog.close,
  read: (model: Model) => Option.some(model.dialog),
  write: (model, nextDialog) => evo(model, { dialog: () => nextDialog }),
  toParentMessage: message => Message.GotDialogMessage({ message }),
  toParentOutMessage: toParentDialogOutMessage,
})

export const closeDialog = (model: Model) => foldDialogClose(model)
