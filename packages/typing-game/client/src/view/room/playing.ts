import classNames from 'classnames'
import { Array, Number, Option, Order, String as Str, pipe } from 'effect'
import { Html } from 'foldkit/html'

import { USER_TEXT_INPUT_ID } from '../../constant'
import { UserTextInputted } from '../../message'
import {
  Autocapitalize,
  Autocorrect,
  Class,
  Id,
  OnInput,
  Spellcheck,
  Value,
  div,
  empty,
  span,
  textarea,
} from '../html'

const typing = (
  gameText: string,
  userText: string,
  maybeWrongCharIndex: Option.Option<number>,
): Html =>
  div(
    [Class('relative')],
    [
      textarea(
        [
          Id(USER_TEXT_INPUT_ID),
          Value(userText),
          Class('absolute inset-0 opacity-0 z-10 resize-none'),
          OnInput((value) => UserTextInputted.make({ value })),
          Spellcheck(false),
          Autocorrect('off'),
          Autocapitalize('none'),
        ],
        [],
      ),
      gameTextWithProgress(gameText, userText, maybeWrongCharIndex),
    ],
  )

const gameTextWithProgress = (
  gameText: string,
  userText: string,
  maybeWrongCharIndex: Option.Option<number>,
): Html => div([], pipe(gameText, Str.split(''), Array.map(char(userText, maybeWrongCharIndex))))

const char =
  (userText: string, maybeWrongCharIndex: Option.Option<number>) =>
  (char: string, index: number): Html => {
    const userTextLength = Str.length(userText)

    const isNext = index === userTextLength && Option.isNone(maybeWrongCharIndex)

    const isWrong = Option.exists(maybeWrongCharIndex, (wrongIndex) =>
      Order.between(Number.Order)(index, {
        minimum: wrongIndex,
        maximum: Number.decrement(userTextLength),
      }),
    )

    const isUntyped = index >= userTextLength && !isNext
    const isCorrect = index < userTextLength && !isWrong

    const charClassName = classNames({
      'text-terminal-green-dark': isUntyped,
      'text-terminal-green': isCorrect,
      'text-terminal-red bg-terminal-red/20': isWrong,
      'text-terminal-green bg-terminal-green/30': isNext,
    })

    return span([Class(charClassName)], [char])
  }

export const playing = (
  secondsLeft: number,
  maybeGameText: Option.Option<string>,
  userText: string,
  maybeWrongCharIndex: Option.Option<number>,
): Html =>
  div(
    [Class('space-y-6')],
    [
      div(
        [Class('uppercase')],
        [`[Time remaining] ${secondsLeft} ${secondsLeft === 1 ? 'second' : 'seconds'}`],
      ),
      Option.match(maybeGameText, {
        onNone: () => empty,
        onSome: (gameText) => typing(gameText, userText, maybeWrongCharIndex),
      }),
    ],
  )
