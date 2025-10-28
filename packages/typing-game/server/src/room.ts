import { Array, Data, Effect, HashMap, Random, SubscriptionRef, pipe } from 'effect'

import { RoomsStore } from './index.js'

const NUM_WORDS_IN_ID = 3
const DELIMITER = '-'

class RoomIdExists extends Data.TaggedError('RoomIdExists')<{}> {}

export const generateUniqueId = (
  words: ReadonlyArray<string>,
): Effect.Effect<string, never, RoomsStore> =>
  Effect.gen(function* () {
    const roomsStoreRef = yield* RoomsStore
    const roomsStore = yield* SubscriptionRef.get(roomsStoreRef)

    return yield* generateRoomId(words).pipe(
      Effect.filterOrFail(
        (id) => !HashMap.has(roomsStore, id),
        () => new RoomIdExists(),
      ),
      Effect.catchAll(() => generateUniqueId(words)),
    )
  })

const generateRoomId = (words: ReadonlyArray<string>) =>
  Random.nextIntBetween(0, Array.length(words)).pipe(
    Effect.replicateEffect(NUM_WORDS_IN_ID),
    Effect.map(indicesToRoomId(words)),
  )

const indicesToRoomId = (words: ReadonlyArray<string>) => (indices: ReadonlyArray<number>) =>
  pipe(
    indices,
    Array.map((i) => Array.unsafeGet(words, i)),
    Array.join(DELIMITER),
  )
