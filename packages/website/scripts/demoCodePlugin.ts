import { codeToHtml } from 'shiki'
import type { Plugin } from 'vite'

import { shikiDarkTheme, shikiLightTheme } from '../src/shikiTheme'

const shikiThemes = {
  light: shikiLightTheme,
  dark: shikiDarkTheme,
}

const demoCodeToHtml = async (
  importsCode: string,
  bodyCode: string,
): Promise<string> => {
  const importLines = importsCode.trimEnd().split('\n')
  const bodyLines = bodyCode.trimEnd().split('\n')
  const lines = [...importLines, '', ...bodyLines]
  const lineDigits = String(bodyLines.length).length

  const html = await codeToHtml(lines.join('\n'), {
    lang: 'typescript',
    themes: shikiThemes,
    decorations: bodyLines.map((line, index) => ({
      start: { line: importLines.length + 1 + index, character: 0 },
      end: { line: importLines.length + 1 + index, character: line.length },
      properties: { 'data-line': index + 1 },
    })),
  })

  return html.replace('<pre ', `<pre data-line-digits="${lineDigits}" `)
}

const demoCodePlugin = (
  name: string,
  virtualId: string,
  importsCode: string,
  bodyCode: string,
): Plugin => {
  const resolvedVirtualId = '\0' + virtualId

  return {
    name,
    resolveId(id) {
      if (id === virtualId) {
        return resolvedVirtualId
      } else {
        return undefined
      }
    },
    async load(id) {
      if (id !== resolvedVirtualId) {
        return undefined
      }

      const html = await demoCodeToHtml(importsCode, bodyCode)

      return `export default ${JSON.stringify(html)}`
    },
  }
}

const COUNTER_DEMO_CODE_ID = 'virtual:counter-demo-code'

const DEMO_IMPORTS = `import { Effect, Match as M, Schema as S } from 'effect'
import { Command } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'`

const DEMO_CODE = `// MODEL

const Model = S.Struct({
  count: S.Number,
  isResetting: S.Boolean,
  resetDuration: S.Number,
})

// MESSAGE

const ClickedIncrement = m('ClickedIncrement')
const ChangedResetDuration = m('ChangedResetDuration', {
  seconds: S.Number,
})
const ClickedResetAfterDelay = m('ClickedResetAfterDelay')
const CompletedDelayReset = m('CompletedDelayReset')

// COMMAND

const DelayReset = Command.define(
  'DelayReset',
  { seconds: S.Number },
  CompletedDelayReset,
)(({ seconds }) =>
  Effect.as(Effect.sleep(\`\${seconds} seconds\`), CompletedDelayReset()),
)

// UPDATE

M.tagsExhaustive({
  ClickedIncrement: () => [
    evo(model, { count: count => count + 1 }),
    [],
  ],
  ChangedResetDuration: ({ seconds }) => [
    evo(model, { resetDuration: () => seconds }),
    [],
  ],
  ClickedResetAfterDelay: () => [
    evo(model, { isResetting: () => true }),
    [DelayReset({ seconds: model.resetDuration })],
  ],
  CompletedDelayReset: () => [
    evo(model, { count: () => 0, isResetting: () => false }),
    [],
  ],
})`

/** Serves the async counter demo source as a virtual module of highlighted HTML. */
export const counterDemoCodePlugin = (): Plugin =>
  demoCodePlugin(
    'counter-demo-code',
    COUNTER_DEMO_CODE_ID,
    DEMO_IMPORTS,
    DEMO_CODE,
  )

const NOTE_PLAYER_DEMO_CODE_ID = 'virtual:note-player-demo-code'

const NOTE_PLAYER_DEMO_IMPORTS = `import {
  Context,
  Effect,
  Layer,
  Match as M,
  Schema as S,
} from 'effect'
import { Command } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'`

const NOTE_PLAYER_DEMO_CODE = `// MODEL

const Model = S.Struct({
  noteInput: NoteInputField.Union,
  noteDuration: NoteDuration,
  playbackState: PlaybackState,
})

// MESSAGE

const ClickedPlay = m('ClickedPlay')
const ClickedPause = m('ClickedPause')
const CompletedPlayNote = m('CompletedPlayNote', {
  noteIndex: S.Number,
})

// UPDATE

M.tagsExhaustive({
  ClickedPlay: () => [
    evo(model, {
      playbackState: () =>
        Playing({ noteSequence, currentNoteIndex: 0 }),
    }),
    [playNote(firstNote, model.noteDuration, 0)],
  ],
  ClickedPause: () => [
    evo(model, {
      playbackState: () =>
        Paused({ noteSequence, currentNoteIndex }),
    }),
    [],
  ],
  CompletedPlayNote: ({ noteIndex }) => {
    if (nextIndex >= noteSequence.length) {
      return [
        evo(model, { playbackState: () => Idle() }),
        [],
      ]
    } else {
      return [
        evo(model, {
          playbackState: () =>
            Playing({
              noteSequence,
              currentNoteIndex: nextIndex,
            }),
        }),
        [playNote(nextNote, model.noteDuration, nextIndex)],
      ]
    }
  },
})

// RESOURCE

class AudioContextService extends Context.Service<
  AudioContextService,
  AudioContext
>()('AudioContextService') {
  static readonly Default = Layer.sync(this, () => new AudioContext())
}

// COMMAND

const PlayNote = Command.define(
  'PlayNote',
  { note: Note, duration: S.Number, noteIndex: S.Number },
  CompletedPlayNote,
)(({ note, duration, noteIndex }) =>
  Effect.gen(function* () {
    const audioContext = yield* AudioContextService

    return yield* Effect.callback(resume => {
      const oscillator = audioContext.createOscillator()
      oscillator.frequency.setValueAtTime(
        NOTE_FREQUENCIES[note],
        audioContext.currentTime,
      )
      oscillator.connect(audioContext.destination)
      oscillator.start()
      oscillator.stop(audioContext.currentTime + duration)
      oscillator.onended = () =>
        resume(Effect.succeed(CompletedPlayNote({ noteIndex })))
    })
  }),
)`

/** Serves the note player demo source as a virtual module of highlighted HTML. */
export const notePlayerDemoCodePlugin = (): Plugin =>
  demoCodePlugin(
    'note-player-demo-code',
    NOTE_PLAYER_DEMO_CODE_ID,
    NOTE_PLAYER_DEMO_IMPORTS,
    NOTE_PLAYER_DEMO_CODE,
  )
