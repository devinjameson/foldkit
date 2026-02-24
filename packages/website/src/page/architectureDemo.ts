import classNames from 'classnames'
import {
  Array,
  Duration,
  Effect,
  Match as M,
  Number as N,
  Schema as S,
  pipe,
} from 'effect'
import type { Command } from 'foldkit'
import { Task } from 'foldkit'
import { Html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'
import demoCodeHtml from 'virtual:demo-code'

import {
  AriaHidden,
  AriaLabel,
  Class,
  DataAttribute,
  Disabled,
  For,
  Id,
  InnerHTML,
  Max,
  Min,
  OnClick,
  OnInput,
  Style,
  Type,
  Value,
  button,
  div,
  input,
  keyed,
  label,
  p,
  span,
} from '../html'
import type { Message as ParentMessage } from '../main'

// CONSTANTS

const PHASE_DURATION: Duration.DurationInput = '300 millis'
const MAX_LOG_ENTRIES = 50

// MODEL

const AnimationPhase = S.Literal(
  'Idle',
  'IncrementMessage',
  'IncrementUpdate',
  'IncrementModel',
  'ResetMessage',
  'ResetUpdate',
  'ResetCommand',
  'ResetCommandMessage',
  'ResetCommandUpdate',
  'ResetModel',
)

type AnimationPhase = typeof AnimationPhase.Type

export const Model = S.Struct({
  count: S.Number,
  isResetting: S.Boolean,
  resetDuration: S.Number,
  phase: AnimationPhase,
  generation: S.Number,
  messageLog: S.Array(S.String),
})

export type Model = typeof Model.Type

// MESSAGE

const ClickedDemoIncrement = m('ClickedDemoIncrement')
const ChangedDemoResetDuration = m('ChangedDemoResetDuration', {
  seconds: S.Number,
})
const ClickedDemoReset = m('ClickedDemoReset')
const AdvancedDemoPhase = m('AdvancedDemoPhase', {
  generation: S.Number,
})

export const Message = S.Union(
  ClickedDemoIncrement,
  ChangedDemoResetDuration,
  ClickedDemoReset,
  AdvancedDemoPhase,
)
export type Message = typeof Message.Type

// INIT

export const init = (): [Model, ReadonlyArray<Command<Message>>] => [
  {
    count: 0,
    isResetting: false,
    resetDuration: 2,
    phase: 'Idle',
    generation: 0,
    messageLog: [],
  },
  [],
]

// UPDATE

type UpdateReturn = [Model, ReadonlyArray<Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

const sleepThenAdvance = (
  generation: number,
  duration: Duration.DurationInput,
): Command<typeof AdvancedDemoPhase> =>
  Task.delay(duration).pipe(
    Effect.as(AdvancedDemoPhase({ generation })),
  )

const prependToLog =
  (entry: string) =>
  (messageLog: ReadonlyArray<string>): ReadonlyArray<string> =>
    pipe([entry, ...messageLog], Array.take(MAX_LOG_ENTRIES))

export const update = (
  model: Model,
  message: Message,
): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      ClickedDemoIncrement: () => {
        const nextGeneration = model.generation + 1
        return [
          evo(model, {
            count: N.increment,
            isResetting: () => false,
            phase: () => 'IncrementMessage',
            generation: () => nextGeneration,
            messageLog: prependToLog('ClickedIncrement'),
          }),
          [sleepThenAdvance(nextGeneration, PHASE_DURATION)],
        ]
      },

      ChangedDemoResetDuration: ({ seconds }) => [
        evo(model, {
          resetDuration: () => seconds,
          messageLog: prependToLog(
            `ChangedResetDuration({ seconds: ${seconds} })`,
          ),
        }),
        [],
      ],

      ClickedDemoReset: () => {
        const nextGeneration = model.generation + 1
        return [
          evo(model, {
            isResetting: () => true,
            phase: () => 'ResetMessage',
            generation: () => nextGeneration,
            messageLog: prependToLog('ClickedReset'),
          }),
          [sleepThenAdvance(nextGeneration, PHASE_DURATION)],
        ]
      },

      AdvancedDemoPhase: ({ generation }) => {
        if (generation !== model.generation) {
          return [model, []]
        } else {
          return M.value(model.phase).pipe(
            withUpdateReturn,
            M.when('IncrementMessage', () => [
              evo(model, { phase: () => 'IncrementUpdate' }),
              [sleepThenAdvance(generation, PHASE_DURATION)],
            ]),
            M.when('IncrementUpdate', () => [
              evo(model, { phase: () => 'IncrementModel' }),
              [sleepThenAdvance(generation, PHASE_DURATION)],
            ]),
            M.when('IncrementModel', () => [
              evo(model, { phase: () => 'Idle' }),
              [],
            ]),
            M.when('ResetMessage', () => [
              evo(model, { phase: () => 'ResetUpdate' }),
              [sleepThenAdvance(generation, PHASE_DURATION)],
            ]),
            M.when('ResetUpdate', () => [
              evo(model, { phase: () => 'ResetCommand' }),
              [
                sleepThenAdvance(
                  generation,
                  `${N.clamp(model.resetDuration, { minimum: MIN_RESET_DURATION, maximum: MAX_RESET_DURATION })} seconds`,
                ),
              ],
            ]),
            M.when('ResetCommand', () => [
              evo(model, { phase: () => 'ResetCommandMessage' }),
              [sleepThenAdvance(generation, PHASE_DURATION)],
            ]),
            M.when('ResetCommandMessage', () => [
              evo(model, {
                phase: () => 'ResetCommandUpdate',
                messageLog: prependToLog('CompletedReset'),
              }),
              [sleepThenAdvance(generation, PHASE_DURATION)],
            ]),
            M.when('ResetCommandUpdate', () => [
              evo(model, {
                count: () => 0,
                isResetting: () => false,
                phase: () => 'ResetModel',
              }),
              [sleepThenAdvance(generation, PHASE_DURATION)],
            ]),
            M.when('ResetModel', () => [
              evo(model, { phase: () => 'Idle' }),
              [],
            ]),
            M.when('Idle', () => [model, []]),
            M.exhaustive,
          )
        }
      },
    }),
  )

// VIEW

const phaseLabel = (phase: AnimationPhase): string =>
  M.value(phase).pipe(
    M.when('Idle', () => 'Idle'),
    M.whenOr(
      'IncrementMessage',
      'ResetMessage',
      'ResetCommandMessage',
      () => 'Message',
    ),
    M.whenOr(
      'IncrementUpdate',
      'ResetUpdate',
      'ResetCommandUpdate',
      () => 'Update',
    ),
    M.whenOr('IncrementModel', 'ResetModel', () => 'Model'),
    M.when('ResetCommand', () => 'Command'),
    M.exhaustive,
  )

const phaseColorClass = (phase: AnimationPhase): string =>
  M.value(phase).pipe(
    M.when('Idle', () => 'text-gray-400 dark:text-gray-500'),
    M.whenOr(
      'IncrementMessage',
      'ResetMessage',
      'ResetCommandMessage',
      () => 'text-emerald-600 dark:text-emerald-400',
    ),
    M.whenOr(
      'IncrementUpdate',
      'ResetUpdate',
      'ResetCommandUpdate',
      () => 'text-amber-600 dark:text-amber-400',
    ),
    M.whenOr(
      'IncrementModel',
      'ResetModel',
      () => 'text-blue-600 dark:text-blue-400',
    ),
    M.when(
      'ResetCommand',
      () => 'text-violet-600 dark:text-violet-400',
    ),
    M.exhaustive,
  )

export const view = (
  model: Model,
  toMessage: (message: Message) => ParentMessage,
): Html =>
  div(
    [
      Class(
        'demo-container grid grid-cols-1 lg:grid-cols-[1fr_22rem] lg:grid-rows-[minmax(0,1fr)] gap-4 lg:gap-6',
      ),
    ],
    [
      p(
        [
          Class(
            'text-sm text-gray-400 dark:text-gray-500 text-center lg:hidden',
          ),
        ],
        [
          'On a larger screen, you can see the relevant code highlight in real time as your action runs.',
        ],
      ),
      codePanel(model),
      appPanel(model, toMessage),
    ],
  )

const codePanel = (model: Model): Html =>
  div(
    [
      Class(
        'demo-code-panel rounded-xl order-last lg:order-none bg-[#24292e]',
      ),
      DataAttribute('demo-phase', model.phase),
    ],
    [
      div(
        [Class('demo-code-scroll overflow-auto')],
        [div([InnerHTML(demoCodeHtml)], [])],
      ),
    ],
  )

const appPanel = (
  model: Model,
  toMessage: (message: Message) => ParentMessage,
): Html =>
  div(
    [Class('relative')],
    [
      div(
        [
          Class(
            'lg:absolute lg:inset-0 flex flex-col gap-4 overflow-hidden',
          ),
        ],
        [
          viewAndControlsView(model, toMessage),
          modelStateView(model),
          phaseIndicatorView(model),
          eventLogView(model),
        ],
      ),
    ],
  )

const modelStateView = (model: Model): Html =>
  div(
    [Class('pt-3 border-t border-gray-300 dark:border-gray-800')],
    [
      p(
        [
          Class(
            'text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2',
          ),
        ],
        ['Model State'],
      ),
      div(
        [
          Class(
            'font-mono text-sm bg-gray-200 dark:bg-gray-800 rounded-lg p-3 text-gray-700 dark:text-gray-300 leading-relaxed',
          ),
        ],
        [
          div(
            [],
            [
              span(
                [Class('text-blue-600 dark:text-blue-400')],
                ['count'],
              ),
              span(
                [Class('text-gray-400 dark:text-gray-500')],
                [': '],
              ),
              span(
                [Class('text-amber-600 dark:text-amber-300')],
                [String(model.count)],
              ),
            ],
          ),
          div(
            [],
            [
              span(
                [Class('text-blue-600 dark:text-blue-400')],
                ['isResetting'],
              ),
              span(
                [Class('text-gray-400 dark:text-gray-500')],
                [': '],
              ),
              span(
                [Class('text-amber-600 dark:text-amber-300')],
                [String(model.isResetting)],
              ),
            ],
          ),
          div(
            [],
            [
              span(
                [Class('text-blue-600 dark:text-blue-400')],
                ['resetDuration'],
              ),
              span(
                [Class('text-gray-400 dark:text-gray-500')],
                [': '],
              ),
              span(
                [Class('text-amber-600 dark:text-amber-300')],
                [String(model.resetDuration)],
              ),
            ],
          ),
        ],
      ),
    ],
  )

const MIN_RESET_DURATION = 1
const MAX_RESET_DURATION = 5

const stepperButtonClass = (isDisabled: boolean): string =>
  classNames(
    'px-2.5 rounded-lg border text-sm font-semibold transition',
    {
      'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 cursor-not-allowed':
        isDisabled,
      'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer':
        !isDisabled,
    },
  )

const parseResetDuration = (value: string): number =>
  N.clamp(Number(value), { minimum: 0, maximum: MAX_RESET_DURATION })

const viewAndControlsView = (
  model: Model,
  toMessage: (message: Message) => ParentMessage,
): Html =>
  div(
    [Class('flex flex-col gap-3')],
    [
      div(
        [Class('pb-3 border-b border-gray-300 dark:border-gray-800')],
        [
          div(
            [
              Class(
                'flex items-center justify-center py-4 rounded-lg bg-gray-200 dark:bg-gray-800',
              ),
            ],
            [
              p(
                [
                  Class(
                    'text-3xl font-bold text-gray-800 dark:text-gray-200 font-mono',
                  ),
                ],
                [`${model.count}`],
              ),
            ],
          ),
        ],
      ),
      button(
        [
          Class(
            'px-4 py-2 rounded-lg bg-pink-600 dark:bg-pink-500 text-white text-sm font-semibold transition hover:bg-pink-700 dark:hover:bg-pink-600 active:bg-pink-800 dark:active:bg-pink-700 cursor-pointer',
          ),
          OnClick(toMessage(ClickedDemoIncrement())),
        ],
        ['Add 1'],
      ),
      div(
        [Class('flex flex-col gap-1')],
        [
          label(
            [
              For('demo-reset-duration'),
              Class('text-xs text-gray-500 dark:text-gray-400'),
            ],
            ['Reset Delay (seconds)'],
          ),
          div(
            [Class('flex gap-1')],
            [
              input([
                Id('demo-reset-duration'),
                Class(
                  'flex-1 min-w-0 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-sm text-gray-800 dark:text-gray-200 font-mono',
                ),
                Type('number'),
                Min(String(MIN_RESET_DURATION)),
                Max(String(MAX_RESET_DURATION)),
                Value(String(model.resetDuration)),
                OnInput(value =>
                  toMessage(
                    ChangedDemoResetDuration({
                      seconds: parseResetDuration(value),
                    }),
                  ),
                ),
              ]),
              button(
                [
                  Class(
                    stepperButtonClass(
                      model.resetDuration <= MIN_RESET_DURATION,
                    ),
                  ),
                  AriaLabel('Decrease reset delay'),
                  Disabled(model.resetDuration <= MIN_RESET_DURATION),
                  OnClick(
                    toMessage(
                      ChangedDemoResetDuration({
                        seconds: N.clamp(model.resetDuration - 1, {
                          minimum: MIN_RESET_DURATION,
                          maximum: MAX_RESET_DURATION,
                        }),
                      }),
                    ),
                  ),
                ],
                ['\u2212'],
              ),
              button(
                [
                  Class(
                    stepperButtonClass(
                      model.resetDuration >= MAX_RESET_DURATION,
                    ),
                  ),
                  AriaLabel('Increase reset delay'),
                  Disabled(model.resetDuration >= MAX_RESET_DURATION),
                  OnClick(
                    toMessage(
                      ChangedDemoResetDuration({
                        seconds: N.clamp(model.resetDuration + 1, {
                          minimum: MIN_RESET_DURATION,
                          maximum: MAX_RESET_DURATION,
                        }),
                      }),
                    ),
                  ),
                ],
                ['+'],
              ),
            ],
          ),
        ],
      ),
      button(
        [
          Class(
            classNames(
              'px-4 py-2 rounded-lg text-sm font-semibold transition',
              {
                'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed':
                  model.isResetting,
                'bg-pink-600 dark:bg-pink-500 text-white hover:bg-pink-700 dark:hover:bg-pink-600 active:bg-pink-800 dark:active:bg-pink-700 cursor-pointer':
                  !model.isResetting,
              },
            ),
          ),
          Disabled(model.isResetting),
          OnClick(toMessage(ClickedDemoReset())),
        ],
        [
          model.isResetting
            ? 'Resetting...'
            : `Reset after ${model.resetDuration} seconds`,
        ],
      ),
    ],
  )

const phaseIndicatorView = (model: Model): Html => {
  const label = phaseLabel(model.phase)
  const colorClass = phaseColorClass(model.phase)
  const isCommand = model.phase === 'ResetCommand'

  return div(
    [],
    [
      p(
        [
          Class(
            'text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2',
          ),
        ],
        ['Phase'],
      ),
      div(
        [
          Class(
            'flex items-center gap-2 text-xs font-semibold uppercase tracking-wider',
          ),
        ],
        [
          div(
            [Class('w-2 h-2 rounded-full bg-current ' + colorClass)],
            [],
          ),
          span([Class(colorClass)], [label]),
          div(
            [
              AriaHidden(true),
              Class(
                classNames(
                  'flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden transition-opacity duration-200',
                  {
                    'opacity-100': isCommand,
                    'opacity-0': !isCommand,
                  },
                ),
              ),
            ],
            [
              div(
                [
                  Class(
                    classNames(
                      'demo-progress-bar h-full rounded-full bg-violet-600 dark:bg-violet-400',
                      {
                        'demo-progress-bar-active': isCommand,
                      },
                    ),
                  ),
                  Style({
                    '--reset-duration': String(model.resetDuration),
                  }),
                ],
                [],
              ),
            ],
          ),
        ],
      ),
    ],
  )
}

const eventLogView = (model: Model): Html =>
  div(
    [Class('flex-1 flex flex-col min-h-0')],
    [
      p(
        [
          Class(
            'text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2',
          ),
        ],
        ['Message Log'],
      ),
      div(
        [
          Class(
            'font-mono text-xs bg-gray-200 dark:bg-gray-800 rounded-lg p-3 flex-1 min-h-0 overflow-y-auto',
          ),
        ],
        Array.map(model.messageLog, (entry, index) =>
          keyed('div')(
            `${entry}-${index}`,
            [
              Class(
                'py-0.5 text-emerald-600 dark:text-emerald-400 break-all',
              ),
            ],
            [span([], [entry])],
          ),
        ),
      ),
    ],
  )
