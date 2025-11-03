import { Array, Effect, Option, Random, pipe } from 'effect'

const theUniverse =
  "The universe, what a concept. You know, the universe is a little bit like the human hand. For example, you have Growman's center right here and then you have undiscovered worlds. And, um, sector 8. And up here we have Tittleman's Crest so you can kind of picture it’s a little bit like a leaf or a... it’s not a bowl. The time it takes to get from one star to another star is - you need to travel at the speed of light. And us humans, we can’t fathom the concept of that kind of time because it's really, really, really, really, really, really, really, really fun to think about taking a speed of light ride."

const neverGonnaGiveYouUp =
  "We're no strangers to love. You know the rules and so do I. A full commitment's what I'm thinkin' of. You wouldn't get this from any other guy. I just wanna tell you how I'm feeling. Gotta make you understand. Never gonna give you up, never gonna let you down. Never gonna run around and desert you. Never gonna make you cry, never gonna say goodbye. Never gonna tell a lie and hurt you. We've known each other for so long. Your heart's been aching, but you're too shy to say it. Inside, we both know what's been going on. We know the game and we're gonna play it. And if you ask me how I'm feeling. Don't tell me you're too blind to see."

const GAME_TEXTS: Array.NonEmptyReadonlyArray<string> = [theUniverse, neverGonnaGiveYouUp]

export const generateGameText: Effect.Effect<string> = Random.nextIntBetween(
  0,
  Array.length(GAME_TEXTS),
).pipe(
  Effect.map((index) =>
    pipe(
      Array.get(GAME_TEXTS, index),
      Option.getOrElse(() => Array.headNonEmpty(GAME_TEXTS)),
    ),
  ),
)
