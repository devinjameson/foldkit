import { Match as M } from 'effect'
import { Update } from 'foldkit'

const foldLoginOutMessage = (
  outMessage: Login.OutMessage,
  { liftCommand }: Update.FoldContext<Login.Message, Message>,
) =>
  M.value(outMessage).pipe(
    M.withReturnType<Update.Step<Model, Message>>(),
    M.tagsExhaustive({
      RequestedMagicLink:
        ({ email }) =>
        model => [
          model,
          [
            liftCommand(
              Login.SendMagicLink({ email, redirectRoute: model.route }),
            ),
          ],
        ],
    }),
  )
