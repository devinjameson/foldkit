import { Effect, Match as M, Schema as S } from 'effect'
import { Runtime } from 'foldkit'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'

const UserSchema = S.Struct({ id: S.String, name: S.String })

const UserLoading = ts('UserLoading')
const UserSuccess = ts('UserSuccess', { data: UserSchema })
const UserFailure = ts('UserFailure', { error: S.String })
const UserState = S.Union(UserLoading, UserSuccess, UserFailure)

const Model = S.Struct({
  userId: S.String,
  user: UserState,
})
type Model = typeof Model.Type

const FetchUser = ts('FetchUser', { userId: S.String })
const UserFetched = ts('UserFetched', { data: UserSchema })
const UserFetchFailed = ts('UserFetchFailed', { error: S.String })
// This Message type represents all possible "things that can happen" in the
// Foldkit application
const Message = S.Union(FetchUser, UserFetched, UserFetchFailed)

type UserFetched = typeof UserFetched.Type
type UserFetchFailed = typeof UserFetchFailed.Type
type Message = typeof Message.Type

const fetchUser = (
  userId: string,
): Runtime.Command<UserFetched | UserFetchFailed> =>
  Effect.gen(function* () {
    // Fetch a user and return a UserFetched or UserFetchFailed message
  })

const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Runtime.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      [Model, ReadonlyArray<Runtime.Command<Message>>]
    >(),
    M.tagsExhaustive({
      FetchUser: ({ userId }) => [
        evo(model, { user: () => UserLoading.make() }),
        [fetchUser(userId)],
      ],
      UserFetched: ({ data }) => [
        evo(model, { user: () => UserSuccess.make({ data }) }),
        [],
      ],
      UserFetchFailed: ({ error }) => [
        evo(model, { user: () => UserFailure.make({ error }) }),
        [],
      ],
    }),
  )
