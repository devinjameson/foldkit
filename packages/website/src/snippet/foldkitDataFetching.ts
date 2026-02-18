import { Effect, Match as M, Schema as S } from 'effect'
import { Runtime } from 'foldkit'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'

const UserSchema = S.Struct({ id: S.String, name: S.String })

const UserLoading = ts('UserLoading')
const UserSuccess = ts('UserSuccess', { data: UserSchema })
const UserFailure = ts('UserFailure', { error: S.String })
const UserState = S.Union(UserLoading, UserSuccess, UserFailure)

// MODEL - your entire application state

const Model = S.Struct({
  userId: S.String,
  user: UserState,
})
type Model = typeof Model.Type

// MESSAGE - events that can happen in your app

const FetchUserClicked = ts('FetchUserClicked', { userId: S.String })
const UserFetchSucceeded = ts('UserFetchSucceeded', {
  data: UserSchema,
})
const UserFetchFailed = ts('UserFetchFailed', { error: S.String })

const Message = S.Union(
  FetchUserClicked,
  UserFetchSucceeded,
  UserFetchFailed,
)

type FetchUserClicked = typeof FetchUserClicked.Type
type UserFetchSucceeded = typeof UserFetchSucceeded.Type
type UserFetchFailed = typeof UserFetchFailed.Type

type Message = typeof Message.Type

// COMMAND - descriptions of side effects that resolve to Messages

const fetchUser = (
  userId: string,
): Runtime.Command<UserFetchSucceeded | UserFetchFailed> =>
  Effect.gen(function* () {
    const response = yield* Effect.tryPromise(() =>
      fetch(`/api/users/${userId}`).then((response) =>
        response.json(),
      ),
    )
    // Validate the response against UserSchema at runtime
    const data = yield* S.decodeUnknown(UserSchema)(response)
    return UserFetchSucceeded({ data })
  }).pipe(
    // Every Command must return a Message — no errors bubble up
    Effect.catchAll((error) =>
      Effect.succeed(UserFetchFailed({ error: String(error) })),
    ),
  )

// UPDATE - how Messages change the Model

const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Runtime.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      [Model, ReadonlyArray<Runtime.Command<Message>>]
    >(),
    // Handle every Message — the type system ensures all cases are covered
    M.tagsExhaustive({
      FetchUserClicked: ({ userId }) => [
        // evo returns an updated copy of Model
        evo(model, { user: () => UserLoading() }),
        [fetchUser(userId)],
      ],
      UserFetchSucceeded: ({ data }) => [
        evo(model, { user: () => UserSuccess({ data }) }),
        [],
      ],
      UserFetchFailed: ({ error }) => [
        evo(model, { user: () => UserFailure({ error }) }),
        [],
      ],
    }),
  )
