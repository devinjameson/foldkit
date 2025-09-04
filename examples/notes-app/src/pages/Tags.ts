import { Data, Effect, pipe } from 'effect'
import {
  div,
  h1,
  h2,
  p,
  input,
  button,
  span,
  a,
  Html,
  Class,
  Href,
  Placeholder,
  Value,
  OnChange,
  OnClick,
  Type,
} from '@foldkit/html'
import { Tag, Note, createTag } from '../types/Note'
import { buildNotesListUrl, buildNoteEditorUrl } from '../routing'

// MODEL
export type Model = {
  readonly selectedTagId: string | null
  readonly newTagName: string
  readonly newTagColor: string
  readonly isCreating: boolean
}

export const initModel: Model = {
  selectedTagId: null,
  newTagName: '',
  newTagColor: '#3b82f6',
  isCreating: false,
}

// MESSAGES
export type Message = Data.TaggedEnum<{
  TagSelected: { tagId: string | null }
  NewTagNameChanged: { name: string }
  NewTagColorChanged: { color: string }
  StartCreating: {}
  CancelCreating: {}
  CreateTag: {}
  DeleteTag: { tagId: string }
}>

export const Message = Data.taggedEnum<Message>()

// UPDATE
export const update = (message: Message) => (model: Model): [Model, Effect.Effect<void>] => {
  return Message.$match(message, {
    TagSelected: ({ tagId }) => [
      { ...model, selectedTagId: tagId },
      Effect.void
    ],
    
    NewTagNameChanged: ({ name }) => [
      { ...model, newTagName: name },
      Effect.void
    ],
    
    NewTagColorChanged: ({ color }) => [
      { ...model, newTagColor: color },
      Effect.void
    ],
    
    StartCreating: () => [
      { ...model, isCreating: true, newTagName: '', newTagColor: '#3b82f6' },
      Effect.void
    ],
    
    CancelCreating: () => [
      { ...model, isCreating: false, newTagName: '', newTagColor: '#3b82f6' },
      Effect.void
    ],
    
    CreateTag: () => [
      { ...model, isCreating: false, newTagName: '', newTagColor: '#3b82f6' },
      Effect.void // In real app, this would create the tag
    ],
    
    DeleteTag: ({ tagId }) => [
      model,
      Effect.void // In real app, this would delete the tag
    ],
  })
}

// VIEW HELPERS
const getTagUsageCount = (tag: Tag, notes: readonly Note[]): number => {
  return notes.filter(note => note.tags.some(t => t.id === tag.id)).length
}

const getTagSize = (usageCount: number, maxCount: number): string => {
  const ratio = maxCount === 0 ? 0.5 : usageCount / maxCount
  if (ratio >= 0.8) return 'text-3xl'
  if (ratio >= 0.6) return 'text-2xl'  
  if (ratio >= 0.4) return 'text-xl'
  if (ratio >= 0.2) return 'text-lg'
  return 'text-base'
}

const colorOptions = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e'
]

const tagCloud = (tags: readonly Tag[], notes: readonly Note[], selectedTagId: string | null) => {
  const maxUsage = Math.max(...tags.map(tag => getTagUsageCount(tag, notes)), 1)
  
  return div(
    [Class('flex flex-wrap gap-4 justify-center items-center p-8')],
    tags.map(tag => {
      const usageCount = getTagUsageCount(tag, notes)
      const isSelected = selectedTagId === tag.id
      
      return button([
        OnClick(Message.TagSelected({ tagId: isSelected ? null : tag.id })),
        Class(`
          ${getTagSize(usageCount, maxUsage)} font-medium px-4 py-2 rounded-full
          transition-all duration-300 cursor-pointer transform hover:scale-110
          ${isSelected 
            ? 'bg-blue-600 text-white shadow-lg ring-4 ring-blue-200' 
            : 'text-gray-700 hover:bg-gray-100 bg-white shadow-sm border border-gray-200'
          }
        `)
      ], [tag.name])
    })
  )
}

const tagDetails = (tag: Tag, notes: readonly Note[]) => {
  const usedInNotes = notes.filter(note => note.tags.some(t => t.id === tag.id))
  
  return div(
    [Class('bg-white rounded-xl shadow-sm border border-gray-200 p-6')],
    [
      // Tag info
      div(
        [Class('flex items-center justify-between mb-4')],
        [
          div(
            [Class('flex items-center space-x-3')],
            [
              span([
                Class('w-4 h-4 rounded-full'),
                // In real app, you'd set background-color style
              ]),
              h2([Class('text-xl font-semibold text-gray-900')], [tag.name])
            ]
          ),
          button([
            OnClick(Message.DeleteTag({ tagId: tag.id })),
            Class('text-red-600 hover:text-red-800 text-sm font-medium transition-colors')
          ], ['Delete'])
        ]
      ),
      
      // Usage stats
      p([
        Class('text-gray-600 mb-6')
      ], [`Used in ${usedInNotes.length} note${usedInNotes.length === 1 ? '' : 's'}`]),
      
      // Notes using this tag
      ...(usedInNotes.length > 0 ? [
        div([], [
          h3([Class('text-sm font-medium text-gray-900 mb-3')], ['Notes with this tag:']),
          div(
            [Class('space-y-2')],
            usedInNotes.map(note => 
              a([
                Href(buildNoteEditorUrl(note.id)),
                Class(`block p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors
                       border border-gray-200 hover:border-gray-300`)
              ], [
                p([Class('font-medium text-gray-900')], [note.title || 'Untitled']),
                ...(note.content ? [
                  p([Class('text-sm text-gray-600 mt-1 line-clamp-2')], [
                    note.content.slice(0, 100) + (note.content.length > 100 ? '...' : '')
                  ])
                ] : [])
              ])
            )
          )
        ])
      ] : [
        p([Class('text-gray-500 italic')], ['No notes use this tag yet'])
      ])
    ]
  )
}

const createTagForm = (model: Model) =>
  div(
    [Class('bg-white rounded-xl shadow-sm border border-gray-200 p-6')],
    [
      h2([Class('text-lg font-semibold text-gray-900 mb-4')], ['Create New Tag']),
      
      div([Class('space-y-4')], [
        // Tag name input
        div([], [
          input([
            Type('text'),
            Value(model.newTagName),
            OnInput((name) => Message.NewTagNameChanged({ name })),
            Placeholder('Tag name...'),
            Class(`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none 
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent`)
          ])
        ]),
        
        // Color picker
        div([], [
          p([Class('text-sm font-medium text-gray-700 mb-2')], ['Color']),
          div(
            [Class('flex flex-wrap gap-2')],
            colorOptions.map(color =>
              button([
                OnClick(Message.NewTagColorChanged({ color })),
                Class(`w-8 h-8 rounded-full border-2 transition-all ${
                  model.newTagColor === color 
                    ? 'border-gray-400 ring-2 ring-offset-1 ring-gray-300' 
                    : 'border-gray-200 hover:border-gray-300'
                }`),
                // In real app, you'd set background-color style
              ])
            )
          )
        ]),
        
        // Actions
        div([Class('flex space-x-3 pt-2')], [
          button([
            OnClick(Message.CreateTag()),
            Class(`px-4 py-2 bg-blue-600 text-white font-medium rounded-lg 
                   hover:bg-blue-700 transition-colors ${
                     !model.newTagName.trim() ? 'opacity-50 cursor-not-allowed' : ''
                   }`)
          ], ['Create Tag']),
          
          button([
            OnClick(Message.CancelCreating()),
            Class('px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors')
          ], ['Cancel'])
        ])
      ])
    ]
  )

// MAIN VIEW
export const view = (model: Model, tags: readonly Tag[], notes: readonly Note[]): Html => {
  const selectedTag = model.selectedTagId ? tags.find(t => t.id === model.selectedTagId) : null
  
  return div(
    [Class('min-h-screen bg-gray-50')],
    [
      // Header
      div(
        [Class('bg-white shadow-sm border-b border-gray-100')],
        [
          div(
            [Class('max-w-6xl mx-auto px-6 py-6')],
            [
              div(
                [Class('flex items-center justify-between')],
                [
                  div([Class('flex items-center space-x-4')], [
                    a([
                      Href(buildNotesListUrl()),
                      Class('text-gray-600 hover:text-gray-800 transition-colors')
                    ], ['← Back']),
                    h1([Class('text-3xl font-bold text-gray-900')], ['Tags'])
                  ]),
                  
                  ...(model.isCreating ? [] : [
                    button([
                      OnClick(Message.StartCreating()),
                      Class(`px-4 py-2 bg-blue-600 text-white font-medium rounded-lg 
                             hover:bg-blue-700 transition-colors`)
                    ], ['+ New Tag'])
                  ])
                ]
              )
            ]
          )
        ]
      ),
      
      // Content
      div(
        [Class('max-w-6xl mx-auto px-6 py-8')],
        [
          ...(tags.length === 0 && !model.isCreating ? [
            // Empty state
            div(
              [Class('text-center py-16')],
              [
                div([Class('text-6xl mb-4')], ['🏷️']),
                h2([Class('text-2xl font-semibold text-gray-900 mb-2')], ['No tags yet']),
                p([Class('text-gray-600 mb-6')], ['Create tags to organize your notes']),
                button([
                  OnClick(Message.StartCreating()),
                  Class(`px-6 py-3 bg-blue-600 text-white font-medium rounded-lg 
                         hover:bg-blue-700 transition-colors`)
                ], ['Create First Tag'])
              ]
            )
          ] : [
            // Tag cloud
            div([Class('mb-8')], [
              ...(tags.length > 0 ? [
                div([Class('bg-white rounded-xl shadow-sm border border-gray-200')], [
                  tagCloud(tags, notes, model.selectedTagId)
                ])
              ] : [])
            ]),
            
            // Create form or tag details
            div([Class('grid gap-8 lg:grid-cols-2')], [
              // Left column
              div([], [
                ...(model.isCreating ? [createTagForm(model)] : [])
              ]),
              
              // Right column
              div([], [
                ...(selectedTag ? [tagDetails(selectedTag, notes)] : [])
              ])
            ])
          ])
        ]
      )
    ]
  )
}