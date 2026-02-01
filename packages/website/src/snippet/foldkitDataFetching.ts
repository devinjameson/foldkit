import { Effect, Match as M, Schema as S } from 'effect'
import { Runtime } from 'foldkit'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'

const UserSchema = S.Struct({ id: S.String, name: S.String })

const UserLoading = ts('UserLoading')
const UserSuccess = ts('UserSuccess', { data: UserSchema })
const UserFailure = ts('UserFailure', { error: S.String })
const UserState = S.Union(UserLoading, UserSuccess, UserFailure)

// MODEL

const Model = S.Struct({
  userId: S.String,
  user: UserState,
})
type Model = typeof Model.Type

// MESSAGE

const FetchUserClicked = ts('FetchUserClicked', { userId: S.String })
const UserFetchSucceeded = ts('UserFetchSucceeded', {
  data: UserSchema,
})
const UserFetchFailed = ts('UserFetchFailed', { error: S.String })

// The Message Schema represents all events that can update the model
const Message = S.Union(
  FetchUserClicked,
  UserFetchSucceeded,
  UserFetchFailed,
)

type FetchUserClicked = typeof FetchUserClicked.Type
type UserFetchSucceeded = typeof UserFetchSucceeded.Type
type UserFetchFailed = typeof UserFetchFailed.Type

type Message = typeof Message.Type

// COMMAND

const fetchUser = (
  userId: string,
): Runtime.Command<UserFetchSucceeded | UserFetchFailed> =>
  Effect.gen(function* () {
    // Fetch a user and return a UserFetchSucceeded or UserFetchFailed message
  })

// UPDATE

const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Runtime.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      [Model, ReadonlyArray<Runtime.Command<Message>>]
    >(),
    M.tagsExhaustive({
      FetchUserClicked: ({ userId }) => [
        evo(model, { user: () => UserLoading.make() }),
        [fetchUser(userId)],
      ],
      UserFetchSucceeded: ({ data }) => [
        evo(model, { user: () => UserSuccess.make({ data }) }),
        [],
      ],
      UserFetchFailed: ({ error }) => [
        evo(model, { user: () => UserFailure.make({ error }) }),
        [],
      ],
    }),
  )
