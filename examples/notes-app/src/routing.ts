import * as Route from '@foldkit/route'
import { literal, slash, string } from '@foldkit/route'
import { pipe } from 'effect'
import { AppRoute } from './types/Note'

// Route parsers
const notesListRouter = pipe(Route.root, Route.mapTo(AppRoute.NotesList))

const noteEditorRouter = pipe(
  literal('notes'),
  slash(string('noteId')),
  Route.mapTo(AppRoute.NoteEditor),
)

const newNoteRouter = pipe(
  literal('notes'),
  slash(literal('new')),
  Route.mapTo(() => AppRoute.NoteEditor({ noteId: 'new' })),
)

const tagsRouter = pipe(literal('tags'), Route.mapTo(AppRoute.Tags))

const settingsRouter = pipe(literal('settings'), Route.mapTo(AppRoute.Settings))

// Combined router
export const routeParser = Route.oneOf(
  noteEditorRouter,
  newNoteRouter,
  tagsRouter,
  settingsRouter,
  notesListRouter, // Keep this last as it matches root
)

// URL matcher with fallback
export const urlToAppRoute = Route.parseUrlWithFallback(routeParser, AppRoute.NotFound)

// Route builders
export const buildNotesListUrl = () => notesListRouter.build({})
export const buildNoteEditorUrl = (noteId: string) => noteEditorRouter.build({ noteId })
export const buildNewNoteUrl = () => newNoteRouter.build({})
export const buildTagsUrl = () => tagsRouter.build({})
export const buildSettingsUrl = () => settingsRouter.build({})