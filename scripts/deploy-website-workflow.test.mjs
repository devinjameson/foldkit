import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const workflow = readFileSync(
  resolve(REPO_ROOT, '.github/workflows/deploy-website.yml'),
  'utf8',
)
const maybeConfigSource = workflow.match(
  /cat > \.vercel\/output\/config\.json << 'EOF'\n(?<config>[\s\S]*?)\n\s+EOF/,
)?.groups?.config

assert.ok(maybeConfigSource, 'Vercel output config was not found')
const config = JSON.parse(maybeConfigSource)

const matchingRoutesFor = pathname =>
  config.routes.filter(
    route =>
      typeof route.src === 'string' && new RegExp(route.src).test(pathname),
  )

const headersFor = pathname =>
  matchingRoutesFor(pathname).reduce(
    (headers, route) => ({ ...headers, ...route.headers }),
    {},
  )

const isolationHeadersFor = pathname =>
  Object.fromEntries(
    Object.entries(headersFor(pathname)).filter(([name]) =>
      name.startsWith('Cross-Origin-'),
    ),
  )

test('the deployed playground and Monaco workers share an embedder policy', () => {
  assert.deepEqual(isolationHeadersFor('/playground/ssr'), {
    'Cross-Origin-Embedder-Policy': 'credentialless',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
  })
  assert.deepEqual(isolationHeadersFor('/monacoworkers/ts.worker.bundle.js'), {
    'Cross-Origin-Embedder-Policy': 'credentialless',
    'Cross-Origin-Resource-Policy': 'same-origin',
  })
  const workerEmbedderRoutes = matchingRoutesFor(
    '/monacoworkers/ts.worker.bundle.js',
  ).filter(
    route => route.headers?.['Cross-Origin-Embedder-Policy'] !== undefined,
  )
  assert.equal(workerEmbedderRoutes.length, 1)
  assert.equal(
    workerEmbedderRoutes.every(route => route.continue === true),
    true,
  )
})
