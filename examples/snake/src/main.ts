import { Fold, Runtime } from '@foldkit'
import { Array, Data, Duration, Effect, Match, Stream, pipe } from 'effect'

import { Class, Html, div, h1, p } from '@foldkit/html'

import { GAME, GAME_SPEED } from './constants'
import { Apple, Direction, Position, Snake } from './domain'

// MODEL

export type GameState = 'NotStarted' | 'Playing' | 'Paused' | 'GameOver'

type Model = Readonly<{
  snake: Snake.Snake
  apple: Position.Position
  direction: Direction.Direction
  nextDirection: Direction.Direction
  gameState: GameState
  points: number
  highScore: number
}>

// MESSAGES

type Message = Data.TaggedEnum<{
  ClockTick: {}
  KeyPress: { key: string }
  ChangeDirection: { direction: Direction.Direction }
  PauseGame: {}
  RestartGame: {}
  SetApple: { position: Position.Position }
}>

const Message = Data.taggedEnum<Message>()

// INIT

const init: Runtime.ElementInit<Model, Message> = () => {
  const snake = Snake.create(GAME.INITIAL_POSITION)

  return [
    {
      snake,
      apple: { x: 15, y: 15 },
      direction: GAME.INITIAL_DIRECTION,
      nextDirection: GAME.INITIAL_DIRECTION,
      gameState: 'NotStarted',
      points: 0,
      highScore: 0,
    },
    [Apple.generatePosition(snake).pipe(Effect.map((position) => Message.SetApple({ position })))],
  ]
}

// UPDATE

const update = Fold.fold<Model, Message>({
  KeyPress: (model, { key }) =>
    Match.value(key).pipe(
      Match.withReturnType<[Model, Runtime.Command<Message>[]]>(),
      Match.whenOr(
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'w',
        'a',
        's',
        'd',
        (moveKey) => {
          const nextDirection = Match.value(moveKey).pipe(
            Match.withReturnType<Direction.Direction | null>(),
            Match.whenOr('ArrowUp', 'w', () => 'Up'),
            Match.whenOr('ArrowDown', 's', () => 'Down'),
            Match.whenOr('ArrowLeft', 'a', () => 'Left'),
            Match.whenOr('ArrowRight', 'd', () => 'Right'),
            Match.exhaustive,
          )

          if (model.gameState === 'Playing') {
            return [{ ...model, nextDirection }, []]
          } else {
            return [model, []]
          }
        },
      ),
      Match.when(' ', () => {
        const nextGameState = Match.value(model.gameState).pipe(
          Match.withReturnType<GameState>(),
          Match.when('NotStarted', () => 'Playing'),
          Match.when('Playing', () => 'Paused'),
          Match.when('Paused', () => 'Playing'),
          Match.when('GameOver', () => 'GameOver'),
          Match.exhaustive,
        )
        return [{ ...model, gameState: nextGameState }, []]
      }),
      Match.when('r', () => {
        const nextSnake = Snake.create(GAME.INITIAL_POSITION)

        return [
          {
            ...model,
            snake: nextSnake,
            direction: GAME.INITIAL_DIRECTION,
            nextDirection: GAME.INITIAL_DIRECTION,
            gameState: 'NotStarted',
            points: 0,
          },
          [
            Apple.generatePosition(nextSnake).pipe(
              Effect.map((position) => Message.SetApple({ position })),
            ),
          ],
        ]
      }),
      Match.orElse(() => [model, []]),
    ),

  ClockTick: (model) => {
    if (model.gameState !== 'Playing') {
      return [model, []]
    }

    const currentDirection = Direction.isOpposite(model.direction, model.nextDirection)
      ? model.direction
      : model.nextDirection

    const newHead = Position.move(model.snake[0], currentDirection)
    const willEatApple = Position.equivalence(newHead, model.apple)

    const nextSnake = willEatApple
      ? Snake.grow(model.snake, currentDirection)
      : Snake.move(model.snake, currentDirection)

    if (Snake.hasCollision(nextSnake)) {
      return [
        {
          ...model,
          gameState: 'GameOver',
          highScore: Math.max(model.points, model.highScore),
        },
        [],
      ]
    }

    const commands = willEatApple
      ? [
          Apple.generatePosition(nextSnake).pipe(
            Effect.map((position) => Message.SetApple({ position })),
          ),
        ]
      : []

    return [
      {
        ...model,
        snake: nextSnake,
        direction: currentDirection,
        points: willEatApple ? model.points + GAME.POINTS_PER_APPLE : model.points,
      },
      commands,
    ]
  },

  ChangeDirection: (model, { direction }) => [
    {
      ...model,
      nextDirection: direction,
    },
    [],
  ],

  PauseGame: (model) => [
    {
      ...model,
      gameState: model.gameState === 'Playing' ? 'Paused' : 'Playing',
    },
    [],
  ],

  RestartGame: (model) => {
    const startPos: Position.Position = { x: 10, y: 10 }
    const nextSnake = Snake.create(startPos)

    return [
      {
        ...model,
        snake: nextSnake,
        direction: 'Right',
        nextDirection: 'Right',
        gameState: 'NotStarted',
        points: 0,
      },
      [
        Apple.generatePosition(nextSnake).pipe(
          Effect.map((position) => Message.SetApple({ position })),
        ),
      ],
    ]
  },

  SetApple: (model, { position }) => [
    {
      ...model,
      apple: position,
    },
    [],
  ],
})

// COMMAND STREAMS

type StreamDepsMap = {
  gameClock: { isPlaying: boolean; interval: number }
  keyboard: {}
}

const commandStreams: Runtime.CommandStreams<Model, Message, StreamDepsMap> = {
  gameClock: {
    deps: (model: Model) =>
      Data.struct({
        isPlaying: model.gameState === 'Playing',
        interval: Math.max(GAME_SPEED.MIN_INTERVAL, GAME_SPEED.BASE_INTERVAL - model.points),
      }),
    stream: (deps: { isPlaying: boolean; interval: number }) =>
      Stream.when(
        Stream.tick(Duration.millis(deps.interval)).pipe(
          Stream.map(() => Effect.sync(() => Message.ClockTick())),
        ),
        () => deps.isPlaying,
      ),
  },
  keyboard: {
    deps: () => Data.struct({}),
    stream: () =>
      Stream.fromEventListener<KeyboardEvent>(document, 'keydown').pipe(
        Stream.map((keyboardEvent) =>
          Effect.sync(() => {
            keyboardEvent.preventDefault()
            return Message.KeyPress({ key: keyboardEvent.key })
          }),
        ),
      ),
  },
}

// VIEW

const cellView = (x: number, y: number, model: Model): Html => {
  const isSnakeHead = Position.equivalence({ x, y }, model.snake[0])
  const isSnakeTail = pipe(
    model.snake,
    Array.tailNonEmpty,
    Array.some((segment) => Position.equivalence({ x, y }, segment)),
  )
  const isApple = Position.equivalence({ x, y }, model.apple)

  const cellClass = Match.value({ isSnakeHead, isSnakeTail, isApple }).pipe(
    Match.when({ isSnakeHead: true }, () => 'bg-green-500'),
    Match.when({ isSnakeTail: true }, () => 'bg-green-400'),
    Match.when({ isApple: true }, () => 'bg-red-500'),
    Match.orElse(() => 'bg-gray-800'),
  )

  return div([Class(`w-6 h-6 ${cellClass}`)], [])
}

const gridView = (model: Model): Html =>
  div(
    [Class('inline-block border-2 border-gray-600')],
    Array.makeBy(GAME.GRID_SIZE, (y) =>
      div(
        [Class('flex')],
        Array.makeBy(GAME.GRID_SIZE, (x) => cellView(x, y, model)),
      ),
    ),
  )

const gameStateView = (gameState: GameState): string =>
  Match.value(gameState).pipe(
    Match.when('NotStarted', () => 'Press SPACE to start'),
    Match.when('Playing', () => 'Playing - SPACE to pause'),
    Match.when('Paused', () => 'Paused - SPACE to continue'),
    Match.when('GameOver', () => 'Game Over - Press R to restart'),
    Match.exhaustive,
  )

const instructionsView = (): Html =>
  div(
    [Class('mt-4 text-sm text-gray-400')],
    [
      p([], ['Use ARROW KEYS or WASD to move']),
      p([], ['SPACE to pause/start']),
      p([], ['R to restart']),
    ],
  )

const view = (model: Model): Html =>
  div(
    [Class('flex flex-col items-center justify-center min-h-screen bg-black text-white p-8')],
    [
      h1([Class('text-4xl font-bold mb-4')], ['Snake Game']),
      div(
        [Class('flex gap-8 mb-4')],
        [
          p([Class('text-xl')], [`Score: ${model.points}`]),
          p([Class('text-xl')], [`High Score: ${model.highScore}`]),
        ],
      ),
      p([Class('text-lg mb-4')], [gameStateView(model.gameState)]),
      gridView(model),
      instructionsView(),
    ],
  )

// RUN

const app = Runtime.makeElement({
  init,
  update,
  view,
  commandStreams,
  container: document.getElementById('app')!,
})

Effect.runFork(app)
