import { Console, Effect } from 'effect'
import { FileSystem } from 'effect'
import { Server } from 'foldkit/experimental'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { NodeRuntime, NodeServices } from '@effect/platform-node'

import type * as ServerEntry from '../src/entry.server'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const EXAMPLE_DIR = resolve(SCRIPT_DIR, '..')
const CLIENT_DIR = resolve(EXAMPLE_DIR, 'dist/client')
const SERVER_ENTRY_PATH = resolve(EXAMPLE_DIR, 'dist/server/entry.server.js')
const SITE_ORIGIN = 'https://example.com'
const INDEX_PATH = resolve(CLIENT_DIR, 'index.html')
const TEMPLATE_COPY_PATH = resolve(
  EXAMPLE_DIR,
  'node_modules/.cache/foldkit/prerender-template.html',
)
const CONTAINER_ID = 'root'
const CONTAINER_PLACEHOLDER = `<div id="${CONTAINER_ID}"></div>`

const loadServerEntry: Effect.Effect<typeof ServerEntry> = Effect.promise(
  () => import(pathToFileURL(SERVER_ENTRY_PATH).href),
)

// NOTE: the generated `/` is written over `index.html`, which is also where
// the client build leaves the template, so reading the template from that file
// works once and then reads back a page whose placeholder is already replaced.
// The built file is authoritative while it still holds the placeholder, and
// the cached copy it leaves behind is what lets a re-run against one client
// build generate the same pages. The placeholder is the condition
// `injectIntoTemplate` itself enforces, so a static render, which carries no
// hydration stamp, is covered by the same test.
const readTemplate = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem

  const isBuilt = yield* fs.exists(INDEX_PATH)
  if (!isBuilt) {
    return yield* Effect.die(
      new Error(
        `Cannot prerender without a client build: "${INDEX_PATH}" does not exist.`,
      ),
    )
  }

  const builtIndex = yield* fs.readFileString(INDEX_PATH)
  const isTemplate = builtIndex.includes(CONTAINER_PLACEHOLDER)
  if (isTemplate) {
    yield* fs.makeDirectory(dirname(TEMPLATE_COPY_PATH), { recursive: true })
    yield* fs.writeFileString(TEMPLATE_COPY_PATH, builtIndex)
    return builtIndex
  }

  const hasTemplateCopy = yield* fs.exists(TEMPLATE_COPY_PATH)
  if (!hasTemplateCopy) {
    return yield* Effect.die(
      new Error(
        `Cannot prerender: "${INDEX_PATH}" no longer holds the ${CONTAINER_PLACEHOLDER} placeholder, and no copy of the template remains. Run the client build again.`,
      ),
    )
  }

  return yield* fs.readFileString(TEMPLATE_COPY_PATH)
})

const outputFileFor = (path: string): string => {
  const url = new URL(path, SITE_ORIGIN)
  if (url.origin !== SITE_ORIGIN || url.pathname !== path) {
    throw new Error(
      `Cannot generate the non-normalized same-origin path "${path}".`,
    )
  }
  return path === '/'
    ? INDEX_PATH
    : resolve(CLIENT_DIR, path.slice(1), 'index.html')
}

const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const template = yield* readTemplate
  const serverEntry = yield* loadServerEntry

  for (const path of serverEntry.prerenderPaths) {
    const result = yield* Effect.promise(() =>
      serverEntry.renderPage(new Request(`${SITE_ORIGIN}${path}`)),
    )
    if (result._tag === 'Responded') {
      return yield* Effect.die(
        new Error(
          `Cannot write the complete Response returned while generating "${path}" to a static HTML file.`,
        ),
      )
    }
    if (result.status !== undefined && result.status !== 200) {
      return yield* Effect.die(
        new Error(
          `Cannot preserve status ${result.status} while generating "${path}" as a static HTML file.`,
        ),
      )
    }
    if (result.headers !== undefined) {
      return yield* Effect.die(
        new Error(
          `Cannot preserve response headers while generating "${path}" as a static HTML file.`,
        ),
      )
    }
    const html = Server.injectIntoTemplate(template, result.application)
    const outputFile = outputFileFor(path)

    yield* fs.makeDirectory(dirname(outputFile), { recursive: true })
    yield* fs.writeFileString(outputFile, html)
    yield* Console.log(`Generated ${path}`)
  }
}).pipe(Effect.provide(NodeServices.layer))

NodeRuntime.runMain(program)
