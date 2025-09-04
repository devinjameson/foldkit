import { Data, Effect, Option } from 'effect'
import {
  fold,
  makeApplication,
  updateConstructors,
  makeCommand,
  Url,
  UrlRequest,
  Command,
  ApplicationInit,
} from '@foldkit'
import { pushUrl, load } from '@foldkit/navigation'
import {
  Class,
  Html,
  Href,
  Value,
  Placeholder,
  OnChange,
  div,
  h1,
  h2,
  p,
  a,
  input,
  span,
} from '@foldkit/html'

import { AppRoute, Note, Tag, AppSettings } from './types/Note'
import { urlToAppRoute, buildNotesListUrl } from './routing'

// SAMPLE DATA
const sampleNotes: readonly Note[] = [
  {
    id: '1',
    title: 'Welcome to Notes!',
    content: `Welcome to your personal notes app! 

This is a simple note-taking application that demonstrates:

- Clean, modern interface design
- Routing between different sections
- Tag-based organization
- Nested module architecture

This is a demo showing FoldKit patterns and routing capabilities.`,
    tags: [{ id: 't1', name: 'welcome', color: '#10b981' }],
    createdAt: new Date('2024-01-15T10:30:00'),
    updatedAt: new Date('2024-01-15T10:30:00'),
  },
  {
    id: '2',
    title: 'Meeting Notes - Project Alpha',
    content: `Attendees:
- Sarah (Project Manager)
- Mike (Developer)
- Lisa (Designer)

Action Items:
- Complete user interface mockups
- Set up development environment  
- Schedule next check-in meeting

Next Steps:
Review designs by Friday and begin development next week.`,
    tags: [
      { id: 't2', name: 'work', color: '#3b82f6' },
      { id: 't3', name: 'meetings', color: '#8b5cf6' },
    ],
    createdAt: new Date('2024-01-16T14:15:00'),
    updatedAt: new Date('2024-01-16T16:22:00'),
  },
]

const sampleTags: readonly Tag[] = [
  { id: 't1', name: 'welcome', color: '#10b981' },
  { id: 't2', name: 'work', color: '#3b82f6' },
  { id: 't3', name: 'meetings', color: '#8b5cf6' },
  { id: 't4', name: 'recipes', color: '#f59e0b' },
  { id: 't5', name: 'cooking', color: '#ef4444' },
  { id: 't6', name: 'ideas', color: '#06b6d4' },
]

// MODEL

type Model = Readonly<{
  route: AppRoute
  notes: readonly Note[]
  tags: readonly Tag[]
  settings: AppSettings
}>

// MESSAGE

type Message = Data.TaggedEnum<{
  NoOp: {}
  UrlRequestReceived: { request: UrlRequest }
  UrlChanged: { url: Url }
}>

const Message = Data.taggedEnum<Message>()

// INIT

const init: ApplicationInit<Model, Message> = (url: Url) => {
  return [
    {
      route: urlToAppRoute(url),
      notes: sampleNotes,
      tags: sampleTags,
      settings: { theme: 'auto', fontSize: 14, lineSpacing: 1.5 },
    },
    Option.none(),
  ]
}

// UPDATE
const { pure, pureCommand } = updateConstructors<Model, Message>()

const update = fold<Model, Message>({
  NoOp: pure((model) => model),

  UrlRequestReceived: pureCommand((model, { request }): [Model, Command<Message>] => {
    return UrlRequest.$match(request, {
      Internal: ({ url }): [Model, Command<Message>] => [
        {
          ...model,
          route: urlToAppRoute(url),
        },
        makeCommand(pushUrl(url.pathname).pipe(Effect.map(() => Message.NoOp()))),
      ],
      External: ({ href }): [Model, Command<Message>] => [
        model,
        makeCommand(load(href).pipe(Effect.map(() => Message.NoOp()))),
      ],
    })
  }),

  UrlChanged: pureCommand((model, { url }): [Model, Command<Message>] => [
    { ...model, route: urlToAppRoute(url) },
    makeCommand(Effect.succeed(Message.NoOp())),
  ]),
})

// VIEWS
const noteCard = (note: Note): Html =>
  div(
    [
      Class(
        'bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 hover:border-gray-200 p-6',
      ),
    ],
    [
      h2([Class('text-xl font-semibold text-gray-900 mb-2')], [note.title || 'Untitled']),
      ...(note.content
        ? [
            p(
              [Class('text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3')],
              [note.content.length > 150 ? note.content.slice(0, 150) + '...' : note.content],
            ),
          ]
        : []),
      ...(note.tags.length > 0
        ? [
            div(
              [Class('flex flex-wrap gap-1 mb-3')],
              note.tags.map((tag) =>
                span(
                  [
                    Class(
                      'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700',
                    ),
                  ],
                  [tag.name],
                ),
              ),
            ),
          ]
        : []),
    ],
  )

const notesListView = (notes: readonly Note[]): Html =>
  div(
    [Class('min-h-screen bg-gray-50')],
    [
      div(
        [Class('bg-white shadow-sm border-b border-gray-100')],
        [
          div(
            [Class('max-w-6xl mx-auto px-6 py-6')],
            [
              h1([Class('text-3xl font-bold text-gray-900 mb-6')], ['Notes']),
              input([
                Value(''),
                Placeholder('Search notes...'),
                OnChange(() => Message.NoOp()),
                Class(
                  'w-full px-4 py-3 pl-12 text-gray-900 bg-white border border-gray-200 rounded-xl',
                ),
              ]),
            ],
          ),
        ],
      ),
      div(
        [Class('max-w-6xl mx-auto px-6 py-8')],
        [
          ...(notes.length === 0
            ? [
                div(
                  [Class('text-center py-16')],
                  [
                    div([Class('text-6xl mb-4')], ['📝']),
                    h2([Class('text-2xl font-semibold text-gray-900 mb-2')], ['No notes yet']),
                    p([Class('text-gray-600 mb-6')], ['Create your first note to get started']),
                  ],
                ),
              ]
            : [
                div(
                  [Class('grid gap-6 md:grid-cols-2 lg:grid-cols-3')],
                  notes.map((note) => noteCard(note)),
                ),
              ]),
        ],
      ),
    ],
  )

const noteEditorView = (noteId: string): Html =>
  div(
    [Class('min-h-screen bg-white')],
    [
      div(
        [Class('flex items-center justify-between p-4 bg-white border-b border-gray-200')],
        [
          a(
            [
              Href(buildNotesListUrl()),
              Class('text-gray-600 hover:text-gray-800 transition-colors'),
            ],
            ['← Back'],
          ),
          h1(
            [Class('text-lg font-semibold text-gray-900')],
            [noteId === 'new' ? 'New Note' : 'Edit Note'],
          ),
        ],
      ),
      div([Class('p-6')], [p([Class('text-gray-600')], [`Editing note: ${noteId}`])]),
    ],
  )

const tagsView = (): Html =>
  div(
    [Class('min-h-screen bg-gray-50')],
    [
      div(
        [Class('bg-white shadow-sm border-b border-gray-100')],
        [
          div(
            [Class('max-w-6xl mx-auto px-6 py-6')],
            [h1([Class('text-3xl font-bold text-gray-900')], ['Tags'])],
          ),
        ],
      ),
      div(
        [Class('max-w-6xl mx-auto px-6 py-8')],
        [p([Class('text-gray-600')], ['Tag management coming soon...'])],
      ),
    ],
  )

const settingsView = (): Html =>
  div(
    [Class('min-h-screen bg-gray-50')],
    [
      div(
        [Class('bg-white shadow-sm border-b border-gray-100')],
        [
          div(
            [Class('max-w-4xl mx-auto px-6 py-6')],
            [h1([Class('text-3xl font-bold text-gray-900')], ['Settings'])],
          ),
        ],
      ),
      div(
        [Class('max-w-4xl mx-auto px-6 py-8')],
        [p([Class('text-gray-600')], ['Settings coming soon...'])],
      ),
    ],
  )

const notFoundView = (path: string): Html =>
  div(
    [Class('min-h-screen bg-gray-50 flex items-center justify-center')],
    [
      div(
        [Class('text-center')],
        [
          div([Class('text-6xl mb-4')], ['🔍']),
          h1([Class('text-2xl font-bold text-gray-900 mb-2')], ['Page Not Found']),
          p([Class('text-gray-600 mb-6')], [`The path "${path}" doesn't exist.`]),
          a(
            [Href(buildNotesListUrl()), Class('text-blue-600 hover:text-blue-700 font-medium')],
            ['← Back to Notes'],
          ),
        ],
      ),
    ],
  )

// MAIN VIEW
const view = (model: Model): Html => {
  return AppRoute.$match(model.route, {
    NotesList: () => notesListView(model.notes),
    NoteEditor: ({ noteId }) => noteEditorView(noteId),
    Tags: () => tagsView(),
    Settings: () => settingsView(),
    NotFound: ({ path }) => notFoundView(path),
  })
}

// RUN
const app = makeApplication({
  init,
  update,
  view,
  container: document.body,
  browser: {
    onUrlRequest: (request) => Message.UrlRequestReceived({ request }),
    onUrlChange: (url) => Message.UrlChanged({ url }),
  },
})

Effect.runFork(app)
