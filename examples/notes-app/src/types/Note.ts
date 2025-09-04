import { Data, Schema } from 'effect'

export type Tag = {
  readonly id: string
  readonly name: string
  readonly color: string
}

export const TagSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  color: Schema.String,
})

export type Note = {
  readonly id: string
  readonly title: string
  readonly content: string
  readonly tags: readonly Tag[]
  readonly createdAt: Date
  readonly updatedAt: Date
}

export const NoteSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  content: Schema.String,
  tags: Schema.Array(TagSchema),
  createdAt: Schema.Date,
  updatedAt: Schema.Date,
})

export type AppRoute = Data.TaggedEnum<{
  NotesList: {}
  NoteEditor: { noteId: string | 'new' }
  Tags: {}
  Settings: {}
  NotFound: { path: string }
}>

export const AppRoute = Data.taggedEnum<AppRoute>()

export type AppSettings = {
  readonly theme: 'light' | 'dark' | 'auto'
  readonly fontSize: number
  readonly lineSpacing: number
}

export const AppSettingsSchema = Schema.Struct({
  theme: Schema.Literal('light', 'dark', 'auto'),
  fontSize: Schema.Number,
  lineSpacing: Schema.Number,
})

export const createTag = (name: string, color: string = '#3b82f6'): Tag => ({
  id: crypto.randomUUID(),
  name,
  color,
})

export const createNote = (title: string = 'Untitled', content: string = ''): Note => {
  const now = new Date()
  return {
    id: crypto.randomUUID(),
    title,
    content,
    tags: [],
    createdAt: now,
    updatedAt: now,
  }
}

export const updateNote = (note: Note, updates: Partial<Omit<Note, 'id' | 'createdAt'>>): Note => ({
  ...note,
  ...updates,
  updatedAt: new Date(),
})

