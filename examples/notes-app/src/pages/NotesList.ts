import { Data, Effect, Option, pipe, String } from 'effect'
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
  Attribute,
  Class,
  Href,
  Placeholder,
  Value,
  OnChange,
  OnClick,
  Type,
} from '@foldkit/html'
import { Note, Tag } from '../types/Note'
import { buildNoteEditorUrl, buildNewNoteUrl } from '../routing'

// MODEL
export type Model = {
  readonly searchQuery: string
  readonly selectedTags: readonly string[]
}

export const initModel: Model = {
  searchQuery: '',
  selectedTags: [],
}

// MESSAGES
export type Message = Data.TaggedEnum<{
  SearchChanged: { query: string }
  TagToggled: { tagId: string }
  ClearSearch: {}
}>

export const Message = Data.taggedEnum<Message>()

// UPDATE
export const update = (message: Message) => (model: Model): Model => {
  return Message.$match(message, {
    SearchChanged: ({ query }) => ({ ...model, searchQuery: query }),
    TagToggled: ({ tagId }) => ({
      ...model,
      selectedTags: model.selectedTags.includes(tagId)
        ? model.selectedTags.filter(id => id !== tagId)
        : [...model.selectedTags, tagId],
    }),
    ClearSearch: () => ({ ...model, searchQuery: '', selectedTags: [] }),
  })
}

// VIEW HELPERS
const formatDate = (date: Date): string => {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
  })
}

const truncateContent = (content: string, maxLength: number = 150): string => {
  if (content.length <= maxLength) return content
  return content.slice(0, maxLength).trim() + '...'
}

const tagPill = (tag: Tag, isSelected: boolean) =>
  span(
    [
      Class(`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium cursor-pointer transition-all duration-200 ${
        isSelected 
          ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-300' 
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`),
      OnClick(Message.TagToggled({ tagId: tag.id })),
    ],
    [tag.name]
  )

const noteCard = (note: Note) =>
  a(
    [
      Href(buildNoteEditorUrl(note.id)),
      Class(`block bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 
             border border-gray-100 hover:border-gray-200 p-6 group
             animate-fade-in hover:-translate-y-1`),
    ],
    [
      // Note title
      h2(
        [Class('text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors')],
        [note.title || 'Untitled']
      ),
      
      // Note content preview
      ...(note.content ? [
        p(
          [Class('text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3')],
          [truncateContent(note.content)]
        )
      ] : []),
      
      // Tags
      ...(note.tags.length > 0 ? [
        div(
          [Class('flex flex-wrap gap-1 mb-3')],
          note.tags.map(tag => 
            span(
              [
                Class('inline-flex items-center px-2 py-1 rounded-full text-xs font-medium'),
                Class('bg-blue-50 text-blue-700')
              ],
              [tag.name]
            )
          )
        )
      ] : []),
      
      // Date
      p(
        [Class('text-xs text-gray-400 font-medium')],
        [formatDate(note.updatedAt)]
      ),
    ]
  )

const searchBar = (model: Model) =>
  div(
    [Class('relative mb-8')],
    [
      // Search input
      input([
        Type('text'),
        Placeholder('Search notes...'),
        Value(model.searchQuery),
        OnChange((value) => Message.SearchChanged({ query: value })),
        Class(`w-full px-4 py-3 pl-12 text-gray-900 bg-white border border-gray-200 
               rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent 
               placeholder-gray-400 shadow-sm transition-all duration-200`),
      ]),
      
      // Search icon
      div(
        [Class('absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none')],
        [
          span([Class('text-gray-400 text-lg')], ['🔍'])
        ]
      ),
      
      // Clear button
      ...(model.searchQuery ? [
        button([
          OnClick(Message.ClearSearch()),
          Class(`absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 
                 hover:text-gray-600 transition-colors`),
        ], ['×'])
      ] : [])
    ]
  )

const emptyState = () =>
  div(
    [Class('text-center py-16')],
    [
      div([Class('text-6xl mb-4')], ['📝']),
      h2([Class('text-2xl font-semibold text-gray-900 mb-2')], ['No notes yet']),
      p([Class('text-gray-600 mb-6')], ['Create your first note to get started']),
      a([
        Href(buildNewNoteUrl()),
        Class(`inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium 
               rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm
               hover:shadow-md transform hover:-translate-y-0.5`)
      ], ['Create Note'])
    ]
  )

const filteredNotes = (notes: readonly Note[], model: Model): readonly Note[] => {
  return pipe(
    notes,
    (notes) => model.searchQuery 
      ? notes.filter(note => 
          String.toLowerCase(note.title).includes(String.toLowerCase(model.searchQuery)) ||
          String.toLowerCase(note.content).includes(String.toLowerCase(model.searchQuery))
        )
      : notes,
    (notes) => model.selectedTags.length > 0
      ? notes.filter(note => 
          note.tags.some(tag => model.selectedTags.includes(tag.id))
        )
      : notes
  )
}

// MAIN VIEW
export const view = (model: Model, notes: readonly Note[], allTags: readonly Tag[]) => {
  const filtered = filteredNotes(notes, model)
  
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
                [Class('flex items-center justify-between mb-6')],
                [
                  h1([Class('text-3xl font-bold text-gray-900')], ['Notes']),
                  a([
                    Href(buildNewNoteUrl()),
                    Class(`inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium 
                           rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm
                           hover:shadow-md transform hover:-translate-y-0.5`)
                  ], ['+ New Note'])
                ]
              ),
              
              searchBar(model),
              
              // Tag filters
              ...(allTags.length > 0 ? [
                div(
                  [Class('flex flex-wrap gap-2')],
                  allTags.map(tag => tagPill(tag, model.selectedTags.includes(tag.id)))
                )
              ] : [])
            ]
          )
        ]
      ),
      
      // Content
      div(
        [Class('max-w-6xl mx-auto px-6 py-8')],
        [
          ...(filtered.length === 0 ? [
            notes.length === 0 ? emptyState() : 
            div(
              [Class('text-center py-16')],
              [
                div([Class('text-4xl mb-4')], ['🔍']),
                h2([Class('text-xl font-semibold text-gray-900 mb-2')], ['No notes found']),
                p([Class('text-gray-600')], ['Try adjusting your search or filters']),
              ]
            )
          ] : [
            // Notes grid
            div(
              [Class('grid gap-6 md:grid-cols-2 lg:grid-cols-3')],
              filtered.map(note => noteCard(note))
            )
          ])
        ]
      )
    ]
  )
}