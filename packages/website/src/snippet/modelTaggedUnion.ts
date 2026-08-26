import { Schema as S } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

const EditorMode = defineTaggedUnion({
  Browsing: {},
  Editing: { noteId: S.String },
  Previewing: { noteId: S.String },
})
type EditorMode = typeof EditorMode.Type

const Model = S.Struct({
  editorMode: EditorMode,
})
type Model = typeof Model.Type

const init = (): Model => ({
  editorMode: EditorMode.Browsing(),
})

const modeLabel = (mode: EditorMode): string =>
  EditorMode.match(mode, {
    Browsing: () => 'Browsing notes',
    Editing: ({ noteId }) => `Editing ${noteId}`,
    Previewing: ({ noteId }) => `Previewing ${noteId}`,
  })
