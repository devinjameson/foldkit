import {
  Array,
  Clock,
  Effect,
  Match as M,
  Option,
  Random,
  Schema as S,
  String,
} from 'effect'
import { Runtime } from 'foldkit'
import { Html, html } from 'foldkit/html'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'

// MODEL

const Star = S.Struct({
  id: S.String,
  title: S.String,
  note: S.String,
  palette: S.Number,
  x: S.Number,
  y: S.Number,
  size: S.Number,
  tilt: S.Number,
  folded: S.Boolean,
  createdAt: S.Number,
})

type Star = typeof Star.Type

const Stars = S.Array(Star)

type Stars = typeof Stars.Type

const Filter = S.Literal('All', 'Folded', 'Unfolded')

type Filter = typeof Filter.Type

const Model = S.Struct({
  stars: Stars,
  draftTitle: S.String,
  draftNote: S.String,
  filter: Filter,
  selectedId: S.Option(S.String),
})

type Model = typeof Model.Type

// MESSAGE

const UpdateDraftTitle = ts('UpdateDraftTitle', { title: S.String })
const UpdateDraftNote = ts('UpdateDraftNote', { note: S.String })
const AddStar = ts('AddStar')
const GotStarData = ts('GotStarData', { star: Star })
const ToggleFold = ts('ToggleFold', { id: S.String })
const SelectStar = ts('SelectStar', { id: S.String })
const ClearSelection = ts('ClearSelection')
const RemoveStar = ts('RemoveStar', { id: S.String })
const SetFilter = ts('SetFilter', { filter: Filter })

const Message = S.Union(
  UpdateDraftTitle,
  UpdateDraftNote,
  AddStar,
  GotStarData,
  ToggleFold,
  SelectStar,
  ClearSelection,
  RemoveStar,
  SetFilter,
)

export type Message = typeof Message.Type

type UpdateDraftTitle = typeof UpdateDraftTitle.Type

type UpdateDraftNote = typeof UpdateDraftNote.Type

type AddStar = typeof AddStar.Type

type GotStarData = typeof GotStarData.Type

type ToggleFold = typeof ToggleFold.Type

type SelectStar = typeof SelectStar.Type

type ClearSelection = typeof ClearSelection.Type

type RemoveStar = typeof RemoveStar.Type

type SetFilter = typeof SetFilter.Type

// INIT

const init: Runtime.ElementInit<Model, Message> = () => [
  {
    stars: [],
    draftTitle: '',
    draftNote: '',
    filter: 'All',
    selectedId: Option.none(),
  },
  [],
]

// UPDATE

const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Runtime.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Runtime.Command<Message>>]>(),
    M.tagsExhaustive({
      UpdateDraftTitle: ({ title }) => [
        evo(model, {
          draftTitle: () => title,
        }),
        [],
      ],

      UpdateDraftNote: ({ note }) => [
        evo(model, {
          draftNote: () => note,
        }),
        [],
      ],

      AddStar: () => {
        const title = String.trim(model.draftTitle)
        const note = String.trim(model.draftNote)

        if (String.isEmpty(title) && String.isEmpty(note)) {
          return [model, []]
        }

        const finalizedTitle = String.isEmpty(title) ? 'Untitled Fold' : title

        return [model, [generateStarData(finalizedTitle, note)]]
      },

      GotStarData: ({ star }) => [
        evo(model, {
          stars: () => [star, ...model.stars],
          draftTitle: () => '',
          draftNote: () => '',
          selectedId: () => Option.some(star.id),
        }),
        [],
      ],

      ToggleFold: ({ id }) => [
        evo(model, {
          stars: () =>
            Array.map(model.stars, (star) =>
              star.id === id
                ? evo(star, { folded: (folded) => !folded })
                : star,
            ),
        }),
        [],
      ],

      SelectStar: ({ id }) => [
        evo(model, {
          selectedId: () => Option.some(id),
        }),
        [],
      ],

      ClearSelection: () => [
        evo(model, {
          selectedId: () => Option.none(),
        }),
        [],
      ],

      RemoveStar: ({ id }) => {
        const nextStars = Array.filter(model.stars, (star) => star.id !== id)
        const nextSelected = Option.match(model.selectedId, {
          onNone: () => model.selectedId,
          onSome: (selectedId) =>
            selectedId === id ? Option.none() : model.selectedId,
        })

        return [
          evo(model, {
            stars: () => nextStars,
            selectedId: () => nextSelected,
          }),
          [],
        ]
      },

      SetFilter: ({ filter }) => [
        evo(model, {
          filter: () => filter,
        }),
        [],
      ],
    }),
  )

// COMMAND

const palette = [
  {
    name: 'Aurora',
    card: 'from-emerald-400/30 via-cyan-200/20 to-sky-200/20',
    glow: 'shadow-emerald-400/40',
    border: 'border-emerald-200/40',
    accent: 'text-emerald-200',
    chip: 'bg-emerald-400/20 text-emerald-100',
  },
  {
    name: 'Nocturne',
    card: 'from-indigo-400/30 via-purple-300/20 to-blue-300/20',
    glow: 'shadow-indigo-400/40',
    border: 'border-indigo-200/40',
    accent: 'text-indigo-200',
    chip: 'bg-indigo-400/20 text-indigo-100',
  },
  {
    name: 'Dawn',
    card: 'from-rose-400/30 via-amber-200/20 to-orange-200/20',
    glow: 'shadow-rose-400/40',
    border: 'border-rose-200/40',
    accent: 'text-rose-100',
    chip: 'bg-rose-400/20 text-rose-100',
  },
  {
    name: 'Iris',
    card: 'from-fuchsia-400/30 via-purple-200/20 to-pink-200/20',
    glow: 'shadow-fuchsia-400/40',
    border: 'border-fuchsia-200/40',
    accent: 'text-fuchsia-100',
    chip: 'bg-fuchsia-400/20 text-fuchsia-100',
  },
  {
    name: 'Tide',
    card: 'from-teal-400/30 via-slate-200/20 to-cyan-200/20',
    glow: 'shadow-teal-400/40',
    border: 'border-teal-200/40',
    accent: 'text-teal-100',
    chip: 'bg-teal-400/20 text-teal-100',
  },
]

const randomId = Effect.gen(function* () {
  const randomValue = yield* Random.next
  return randomValue.toString(36).substring(2, 10)
})

const randomInRange = (min: number, max: number) =>
  Effect.map(Random.next, (value) => min + value * (max - min))

const randomInt = (min: number, max: number) =>
  Effect.map(Random.next, (value) => Math.floor(min + value * (max - min + 1)))

const generateStarData = (
  title: string,
  note: string,
): Runtime.Command<GotStarData> =>
  Effect.gen(function* () {
    const id = yield* randomId
    const paletteIndex = yield* randomInt(0, palette.length - 1)
    const x = yield* randomInRange(12, 88)
    const y = yield* randomInRange(12, 88)
    const size = yield* randomInRange(180, 260)
    const tilt = yield* randomInRange(-8, 8)
    const createdAt = yield* Clock.currentTimeMillis

    return GotStarData.make({
      star: {
        id,
        title,
        note,
        palette: paletteIndex,
        x,
        y,
        size,
        tilt,
        folded: false,
        createdAt,
      },
    })
  })

// VIEW

const {
  button,
  div,
  empty,
  footer,
  form,
  h1,
  h2,
  header,
  input,
  label,
  li,
  main,
  p,
  section,
  span,
  textarea,
  ul,
  Class,
  Disabled,
  For,
  OnClick,
  OnInput,
  OnSubmit,
  Placeholder,
  Style,
  Type,
  Value,
} = html<Message>()

const getPalette = (index: number) => palette[index] ?? palette[0]

const selectedMatch = (model: Model, id: string) =>
  Option.match(model.selectedId, {
    onNone: () => false,
    onSome: (selectedId) => selectedId === id,
  })

const filterStars = (stars: Stars, filter: Filter) =>
  M.value(filter).pipe(
    M.when('All', () => stars),
    M.when('Folded', () => Array.filter(stars, (star) => star.folded)),
    M.when('Unfolded', () => Array.filter(stars, (star) => !star.folded)),
    M.exhaustive,
  )

const foldButton = (label: string, active: boolean, filter: Filter) =>
  button(
    [
      Type('button'),
      OnClick(SetFilter.make({ filter })),
      Class(
        `px-3 py-1 rounded-full text-xs uppercase tracking-[0.2em] transition ${
          active
            ? 'bg-white/20 text-white'
            : 'bg-white/5 text-white/60 hover:bg-white/10'
        }`,
      ),
    ],
    [label],
  )

const starListItem = (model: Model, star: Star): Html => {
  const accent = getPalette(star.palette)
  const isSelected = selectedMatch(model, star.id)

  return li(
    [Class('group')],
    [
      button(
        [
          Type('button'),
          OnClick(SelectStar.make({ id: star.id })),
          Class(
            `w-full text-left border rounded-2xl px-4 py-4 transition backdrop-blur-xl ${accent.border} ${
              isSelected
                ? 'bg-white/15 shadow-lg'
                : 'bg-white/5 hover:bg-white/10'
            }`,
          ),
        ],
        [
          div(
            [Class('flex items-start justify-between gap-3')],
            [
              div(
                [Class('flex-1')],
                [
                  span(
                    [
                      Class(
                        `text-xs uppercase tracking-[0.2em] ${accent.accent}`,
                      ),
                    ],
                    [accent.name],
                  ),
                  h2(
                    [Class('text-lg font-semibold text-white mt-1')],
                    [star.title],
                  ),
                  p(
                    [Class('text-sm text-white/70 mt-2 line-clamp-2')],
                    [
                      String.isEmpty(star.note)
                        ? 'A quiet fold waiting to bloom.'
                        : star.note,
                    ],
                  ),
                ],
              ),
              span(
                [Class(`px-2 py-1 rounded-full text-[11px] ${accent.chip}`)],
                [star.folded ? 'Folded' : 'Open'],
              ),
            ],
          ),
          div(
            [
              Class(
                'mt-4 flex items-center justify-between text-xs text-white/60',
              ),
            ],
            [
              span(
                [],
                [
                  new Date(star.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                ],
              ),
              div(
                [Class('flex gap-2')],
                [
                  button(
                    [
                      Type('button'),
                      OnClick(ToggleFold.make({ id: star.id })),
                      Class(
                        'px-2 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white/80',
                      ),
                    ],
                    [star.folded ? 'Unfold' : 'Fold'],
                  ),
                  button(
                    [
                      Type('button'),
                      OnClick(RemoveStar.make({ id: star.id })),
                      Class(
                        'px-2 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white/80',
                      ),
                    ],
                    ['Release'],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  )
}

const skyStarCard = (model: Model, star: Star): Html => {
  const accent = getPalette(star.palette)
  const isSelected = selectedMatch(model, star.id)

  return div(
    [
      Class(
        `absolute transition duration-500 ${
          isSelected ? 'scale-105' : 'scale-100'
        }`,
      ),
      Style({
        left: `${star.x}%`,
        top: `${star.y}%`,
        width: `${star.size}px`,
        transform: `translate(-50%, -50%) rotate(${star.tilt}deg)`,
      }),
    ],
    [
      div(
        [
          Class(
            `rounded-3xl border bg-gradient-to-br ${accent.card} ${accent.border} ${accent.glow} shadow-2xl backdrop-blur-xl px-5 py-4`,
          ),
          OnClick(SelectStar.make({ id: star.id })),
        ],
        [
          div(
            [Class('flex items-center justify-between gap-2')],
            [
              span(
                [Class(`text-xs uppercase tracking-[0.2em] ${accent.accent}`)],
                [accent.name],
              ),
              span(
                [Class('text-[11px] text-white/60')],
                [star.folded ? 'Folded' : 'Open'],
              ),
            ],
          ),
          h2([Class('text-lg font-semibold text-white mt-2')], [star.title]),
          star.folded
            ? p(
                [Class('text-sm text-white/60 mt-2')],
                ['Tap to unfold this note.'],
              )
            : p(
                [Class('text-sm text-white/70 mt-2')],
                [
                  String.isEmpty(star.note)
                    ? 'A luminous hush floats here.'
                    : star.note,
                ],
              ),
          div(
            [Class('mt-4 flex items-center justify-between')],
            [
              button(
                [
                  Type('button'),
                  OnClick(ToggleFold.make({ id: star.id })),
                  Class(
                    'px-3 py-1 rounded-full bg-white/15 hover:bg-white/25 text-xs text-white',
                  ),
                ],
                [star.folded ? 'Unfold' : 'Fold'],
              ),
              button(
                [
                  Type('button'),
                  OnClick(RemoveStar.make({ id: star.id })),
                  Class(
                    'px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs text-white/80',
                  ),
                ],
                ['Release'],
              ),
            ],
          ),
        ],
      ),
    ],
  )
}

const emptySky = div(
  [Class('absolute inset-0 flex items-center justify-center')],
  [
    div(
      [
        Class(
          'max-w-md text-center text-white/70 bg-white/5 border border-white/10 rounded-3xl px-8 py-10 backdrop-blur-xl',
        ),
      ],
      [
        h2([Class('text-2xl font-semibold text-white')], ['Start a fold']),
        p(
          [Class('mt-3 text-sm leading-relaxed')],
          [
            'Capture a spark of wonder. Each fold becomes a glowing card in your night garden.',
          ],
        ),
      ],
    ),
  ],
)

const view = (model: Model): Html => {
  const filteredStars = filterStars(model.stars, model.filter)

  return div(
    [Class('min-h-screen bg-slate-950 text-white relative overflow-hidden')],
    [
      div(
        [
          Class(
            'absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.15),_transparent_55%),radial-gradient(circle_at_80%_20%,_rgba(244,114,182,0.12),_transparent_60%),radial-gradient(circle_at_20%_80%,_rgba(45,212,191,0.12),_transparent_60%)]',
          ),
        ],
        [],
      ),
      div(
        [
          Class(
            'relative z-10 grid gap-6 px-6 py-10 lg:grid-cols-[360px_1fr] max-w-6xl mx-auto',
          ),
        ],
        [
          section(
            [Class('flex flex-col gap-6')],
            [
              header(
                [Class('space-y-3')],
                [
                  h1([Class('text-3xl font-semibold')], ['Lumen Garden']),
                  p(
                    [Class('text-sm text-white/70 leading-relaxed')],
                    [
                      'Fold your thoughts into glowing lanterns. Each entry becomes a constellation you can unfold again.',
                    ],
                  ),
                ],
              ),
              form(
                [
                  OnSubmit(AddStar.make()),
                  Class(
                    'bg-white/5 border border-white/10 rounded-3xl p-5 space-y-4 backdrop-blur-xl',
                  ),
                ],
                [
                  div(
                    [],
                    [
                      label(
                        [
                          For('title'),
                          Class('text-xs uppercase tracking-[0.3em]'),
                        ],
                        ['Fold Title'],
                      ),
                      input([
                        Type('text'),
                        Value(model.draftTitle),
                        Placeholder('Midnight wish'),
                        Class(
                          'mt-2 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30',
                        ),
                        OnInput((title) => UpdateDraftTitle.make({ title })),
                      ]),
                    ],
                  ),
                  div(
                    [],
                    [
                      label(
                        [
                          For('note'),
                          Class('text-xs uppercase tracking-[0.3em]'),
                        ],
                        ['Whisper'],
                      ),
                      textarea([
                        Value(model.draftNote),
                        Placeholder('Let it glow with a secret.'),
                        Class(
                          'mt-2 w-full min-h-[120px] rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30',
                        ),
                        OnInput((note) => UpdateDraftNote.make({ note })),
                      ]),
                    ],
                  ),
                  button(
                    [
                      Type('submit'),
                      Disabled(
                        String.isEmpty(String.trim(model.draftTitle)) &&
                          String.isEmpty(String.trim(model.draftNote)),
                      ),
                      Class(
                        'w-full rounded-full bg-white/20 py-2 text-sm font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed',
                      ),
                    ],
                    ['Release a fold'],
                  ),
                ],
              ),
              div(
                [Class('flex flex-wrap items-center gap-2')],
                [
                  foldButton('All', model.filter === 'All', 'All'),
                  foldButton('Folded', model.filter === 'Folded', 'Folded'),
                  foldButton(
                    'Unfolded',
                    model.filter === 'Unfolded',
                    'Unfolded',
                  ),
                ],
              ),
              ul(
                [Class('space-y-4')],
                Array.match(filteredStars, {
                  onEmpty: () => [
                    li(
                      [Class('text-sm text-white/60')],
                      ['No folds match this view yet.'],
                    ),
                  ],
                  onNonEmpty: (stars) =>
                    Array.map(stars, (star) => starListItem(model, star)),
                }),
              ),
            ],
          ),
          main(
            [
              Class(
                'relative min-h-[640px] rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden',
              ),
            ],
            [
              button(
                [
                  Type('button'),
                  OnClick(ClearSelection.make()),
                  Class(
                    'absolute right-6 top-6 z-10 rounded-full bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/70 hover:bg-white/20',
                  ),
                ],
                ['Clear focus'],
              ),
              div(
                [Class('absolute inset-0')],
                Array.match(model.stars, {
                  onEmpty: () => [emptySky],
                  onNonEmpty: (stars) =>
                    Array.map(stars, (star) => skyStarCard(model, star)),
                }),
              ),
            ],
          ),
        ],
      ),
      footer(
        [Class('relative z-10 py-6 text-center text-xs text-white/40')],
        ['Foldkit • Lumen Garden'],
      ),
    ],
  )
}

// RUN

const element = Runtime.makeElement({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root')!,
})

Runtime.run(element)
