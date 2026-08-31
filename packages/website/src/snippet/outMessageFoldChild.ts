import { Match, Option } from 'effect'
import { Update } from 'foldkit'
import { evo } from 'foldkit/struct'

const foldLoginOutMessage = Match.type<Login.OutMessage>().pipe(
  Match.withReturnType<Update.Step<Model, Message>>(),
  Match.tagsExhaustive({
    SucceededLogin:
      ({ sessionId }) =>
      () => ({
        model: LoggedIn({ sessionId }),
        commands: [SaveSession(sessionId)],
      }),
  }),
)

const foldLogin = Update.foldChild({
  update: Login.update,
  read: (model: Model) => Option.some(model.login),
  write: (model, nextLogin) => evo(model, { login: () => nextLogin }),
  toParentMessage: message => GotLoginMessage({ message }),
  foldOutMessage: foldLoginOutMessage,
})

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotLoginMessage: ({ message }) => foldLogin(model, message),
  })
