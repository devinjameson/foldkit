import { Data, Effect } from 'effect'
import {
  div,
  h1,
  input,
  textarea,
  button,
  a,
  span,
  Html,
  Class,
  Href,
  Placeholder,
  Value,
  OnChange,
  OnClick,
  Type,
} from '@foldkit/html'
import { Note, Tag, createNote } from '../types/Note'
import { buildNotesListUrl } from '../routing'

// MODEL
export type Model = {
  readonly note: Note
  readonly isNew: boolean
  readonly isDirty: boolean
  readonly isSaving: boolean
  readonly lastSaved: Date | null
  readonly showPreview: boolean
}

export const initModel = (noteId: string | 'new', existingNote?: Note): Model => ({
  note: noteId === 'new' ? createNote() : (existingNote ?? createNote()),
  isNew: noteId === 'new',
  isDirty: false,
  isSaving: false,
  lastSaved: null,
  showPreview: false,
})

// MESSAGES
export type Message = Data.TaggedEnum<{
  TitleChanged: { title: string }
  ContentChanged: { content: string }
  TogglePreview: {}
  Save: {}
  SaveCompleted: {}
  AddTag: { tag: Tag }
  RemoveTag: { tagId: string }
}>

export const Message = Data.taggedEnum<Message>()

// UPDATE
export const update =
  (message: Message) =>
  (model: Model): [Model, Effect.Effect<void>] => {
    return Message.$match(message, {
      TitleChanged: ({ title }) => [
        { ...model, note: { ...model.note, title }, isDirty: true },
        Effect.void,
      ],

      ContentChanged: ({ content }) => [
        { ...model, note: { ...model.note, content }, isDirty: true },
        Effect.void,
      ],

      TogglePreview: () => [{ ...model, showPreview: !model.showPreview }, Effect.void],

      Save: () => [
        { ...model, isSaving: true },
        Effect.void, // In real app, this would trigger a save effect
      ],

      SaveCompleted: () => [
        {
          ...model,
          isSaving: false,
          isDirty: false,
          lastSaved: new Date(),
          isNew: false,
        },
        Effect.void,
      ],

      AddTag: ({ tag }) => [
        {
          ...model,
          note: {
            ...model.note,
            tags: [...model.note.tags, tag],
          },
          isDirty: true,
        },
        Effect.void,
      ],

      RemoveTag: ({ tagId }) => [
        {
          ...model,
          note: {
            ...model.note,
            tags: model.note.tags.filter((tag) => tag.id !== tagId),
          },
          isDirty: true,
        },
        Effect.void,
      ],
    })
  }

// VIEW HELPERS
const formatSaveStatus = (model: Model): string => {
  if (model.isSaving) return 'Saving...'
  if (model.isDirty) return 'Unsaved changes'
  if (model.lastSaved) {
    const diffSeconds = Math.floor((Date.now() - model.lastSaved.getTime()) / 1000)
    if (diffSeconds < 60) return 'Saved just now'
    return `Saved ${diffSeconds < 3600 ? Math.floor(diffSeconds / 60) : Math.floor(diffSeconds / 3600)}${diffSeconds < 3600 ? 'm' : 'h'} ago`
  }
  return ''
}

const renderMarkdown = (content: string): string => {
  // Simple markdown renderer (in real app, use a proper markdown library)
  return content
    .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mb-4 text-gray-900">$1</h1>')
    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mb-3 text-gray-800">$1</h2>')
    .replace(/^### (.*$)/gm, '<h3 class="text-lg font-medium mb-2 text-gray-800">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    .replace(
      /`(.*?)`/g,
      '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>',
    )
    .replace(/\n\n/g, '</p><p class="mb-4 leading-relaxed text-gray-700">')
    .replace(/^\s*[-*+] (.*)$/gm, '<li class="mb-1">$1</li>')
    .replace(/(<li.*<\/li>)/gs, '<ul class="list-disc list-inside mb-4 space-y-1">$1</ul>')
}

const tagChip = (tag: Tag) =>
  span(
    [
      Class(
        'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 group',
      ),
    ],
    [
      span([], [tag.name]),
      button(
        [
          OnClick(Message.RemoveTag({ tagId: tag.id })),
          Class(
            'ml-2 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-full p-0.5 transition-colors',
          ),
        ],
        ['×'],
      ),
    ],
  )

const toolbar = (model: Model) =>
  div(
    [Class('flex items-center justify-between p-4 bg-white border-b border-gray-200')],
    [
      // Left side - Back button and title
      div(
        [Class('flex items-center space-x-4')],
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
            [model.isNew ? 'New Note' : 'Edit Note'],
          ),
        ],
      ),

      // Center - Save status
      div([Class('text-sm text-gray-500')], [formatSaveStatus(model)]),

      // Right side - Actions
      div(
        [Class('flex items-center space-x-3')],
        [
          button(
            [
              OnClick(Message.TogglePreview()),
              Class(
                `px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  model.showPreview
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`,
              ),
            ],
            [model.showPreview ? 'Edit' : 'Preview'],
          ),

          button(
            [
              OnClick(Message.Save()),
              Class(`px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md 
                   hover:bg-blue-700 transition-colors disabled:opacity-50 ${
                     model.isSaving ? 'opacity-50' : ''
                   }`),
            ],
            [model.isSaving ? 'Saving...' : 'Save'],
          ),
        ],
      ),
    ],
  )

const editorPane = (model: Model) =>
  div(
    [Class('flex-1 flex flex-col')],
    [
      // Title input
      input([
        Type('text'),
        Value(model.note.title),
        OnChange((title) => Message.TitleChanged({ title })),
        Placeholder('Note title...'),
        Class(`w-full px-4 py-3 text-xl font-semibold border-none outline-none 
               placeholder-gray-400 bg-transparent resize-none`),
      ]),

      // Tags
      div(
        [Class('px-4 py-2 border-b border-gray-100')],
        [
          div(
            [Class('flex flex-wrap gap-2')],
            [
              ...model.note.tags.map((tag) => tagChip(tag)),
              button(
                [
                  Class('text-sm text-gray-500 hover:text-blue-600 transition-colors'),
                  OnClick(() => {}), // TODO: Show tag picker
                ],
                ['+ Add tag'],
              ),
            ],
          ),
        ],
      ),

      // Content textarea
      textarea([
        Value(model.note.content),
        OnChange((content) => Message.ContentChanged({ content })),
        Placeholder('Start writing...'),
        Class(`flex-1 w-full px-4 py-4 border-none outline-none resize-none 
               placeholder-gray-400 bg-transparent leading-relaxed font-mono text-sm`),
        Rows(20),
      ]),
    ],
  )

const previewPane = (model: Model) =>
  div(
    [Class('flex-1 flex flex-col bg-gray-50')],
    [
      // Title display
      div(
        [Class('px-6 py-4 bg-white border-b border-gray-200')],
        [h1([Class('text-2xl font-bold text-gray-900')], [model.note.title || 'Untitled'])],
      ),

      // Tags display
      ...(model.note.tags.length > 0
        ? [
            div(
              [Class('px-6 py-3 bg-white border-b border-gray-200')],
              [
                div(
                  [Class('flex flex-wrap gap-2')],
                  model.note.tags.map((tag) =>
                    span(
                      [
                        Class(
                          'px-2 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-full',
                        ),
                      ],
                      [tag.name],
                    ),
                  ),
                ),
              ],
            ),
          ]
        : []),

      // Content preview
      div(
        [Class('flex-1 px-6 py-6 overflow-auto')],
        [
          div(
            [
              Class('prose max-w-none'),
              // Note: In real app, you'd safely render HTML here
            ],
            [model.note.content || 'Nothing to preview yet...'],
          ),
        ],
      ),
    ],
  )

// MAIN VIEW
export const view = (model: Model): Html => {
  return div(
    [Class('h-screen flex flex-col bg-white')],
    [
      toolbar(model),

      div(
        [Class('flex-1 flex overflow-hidden')],
        [
          // Editor pane
          div(
            [Class(`${model.showPreview ? 'w-1/2' : 'w-full'} border-r border-gray-200`)],
            [editorPane(model)],
          ),

          // Preview pane (only shown when toggled)
          ...(model.showPreview ? [div([Class('w-1/2')], [previewPane(model)])] : []),
        ],
      ),
    ],
  )
}

