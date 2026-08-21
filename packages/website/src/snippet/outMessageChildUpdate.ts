import { Option } from 'effect'
import { Command } from 'foldkit'

type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message>>,
  Option.Option<OutMessage>,
]

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    SubmittedLoginForm: () => [
      model,
      [Authenticate(model.email, model.password)],
      Option.none(),
    ],
    SucceededAuthenticate: ({ sessionId }) => [
      model,
      [],
      Option.some(OutMessage.SucceededLogin({ sessionId })),
    ],
  })
