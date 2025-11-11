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
): Html =>
  div(
    [Class('text-3xl')],
    pipe(gameText, Str.split(''), Array.map(char(userText, maybeWrongCharIndex))),
  )

const char =
  (userText: string, maybeWrongCharIndex: Option.Option<number>) =>
  (char: string, index: number): Html => {
    const userTextLength = Str.length(userText)

    const isWrongChar = Option.exists(maybeWrongCharIndex, (wrongIndex) =>
      Order.between(Number.Order)(index, { minimum: wrongIndex, maximum: userTextLength - 1 }),
    )

    const isNextChar = index === userTextLength && Option.isNone(maybeWrongCharIndex)

    const charClassName = classNames({
      'char-untyped': index >= userTextLength && !isNextChar,
      'char-correct': index < userTextLength && !isWrongChar,
      'char-wrong': isWrongChar,
      'char-next': isNextChar,
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
      div([Class('text-3xl uppercase')], [`[Time remaining] ${secondsLeft} seconds`]),
      div([Class('h-px bg-terminal-green my-4')], []),
      Option.match(maybeGameText, {
        onNone: () => empty,
        onSome: (gameText) => typing(gameText, userText, maybeWrongCharIndex),
      }),
    ],
  )
