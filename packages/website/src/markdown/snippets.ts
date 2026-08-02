import { Array, Option, Record as Record_, Result, String, pipe } from 'effect'
import cssSnippets from 'virtual:css-snippets'

// SNIPPETS

/**
 * One compiled snippet: `raw` is the verbatim source for the copy button,
 * `highlighted` is the build-time Shiki HTML rendered through `h.InnerHTML`.
 */
export type Snippet = Readonly<{ raw: string; highlighted: string }>

type SnippetEntry = readonly [string, Snippet]

const rawByPath = import.meta.glob<string>('../snippet/*.{ts,tsx,elm,json}', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const highlightedByPath = import.meta.glob<string>(
  '../snippet/*.{ts,tsx,elm,json}',
  { query: '?highlighted', import: 'default', eager: true },
)

const snippetName = (path: string): Option.Option<string> =>
  pipe(
    Array.last(String.split(path, '/')),
    Option.map(String.replace(/\.(?:ts|tsx|elm|json)$/, '')),
  )

// NOTE: CSS snippets arrive through a virtual module rather than the glob
// above. Vite claims every `.css` id for its own pipeline regardless of the
// query, so a `?highlighted` CSS file gets parsed as stylesheet source and
// breaks the bundle. Highlighting them at config time and handing over a plain
// record sidesteps the pipeline entirely.
const registry: Record<string, Snippet> = pipe(
  Record_.toEntries(rawByPath),
  Array.filterMap(([path, raw]) =>
    pipe(
      Option.all([snippetName(path), Record_.get(highlightedByPath, path)]),
      Option.map(
        ([name, highlighted]): SnippetEntry => [name, { raw, highlighted }],
      ),
      Result.fromOption(() => undefined),
    ),
  ),
  Record_.fromEntries,
  existing => ({ ...existing, ...cssSnippets }),
)

/**
 * Looks up a compiled snippet by its file basename, for example
 * `"counterCommands"` for `src/snippet/counterCommands.ts`.
 */
export const lookupSnippet = (name: string): Option.Option<Snippet> =>
  Record_.get(registry, name)
