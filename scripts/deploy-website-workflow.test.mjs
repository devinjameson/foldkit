import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { websiteVercelConfig } from './website-vercel-config.mjs'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const productionWorkflow = readFileSync(
  resolve(REPO_ROOT, '.github/workflows/deploy-website.yml'),
  'utf8',
)
const canaryWorkflow = readFileSync(
  resolve(REPO_ROOT, '.github/workflows/deploy-website-canary.yml'),
  'utf8',
)
const buildWorkflow = readFileSync(
  resolve(REPO_ROOT, '.github/workflows/deploy-website-build.yml'),
  'utf8',
)
const productionConfig = websiteVercelConfig('production')
const canaryConfig = websiteVercelConfig('canary')

const matchingRoutesFor = (config, pathname) =>
  config.routes.filter(
    route =>
      typeof route.src === 'string' && new RegExp(route.src).test(pathname),
  )

const headersFor = (config, pathname) =>
  matchingRoutesFor(config, pathname).reduce(
    (headers, route) => ({ ...headers, ...route.headers }),
    {},
  )

const isolationHeadersFor = (config, pathname) =>
  Object.fromEntries(
    Object.entries(headersFor(config, pathname)).filter(([name]) =>
      name.startsWith('Cross-Origin-'),
    ),
  )

test('the deployed playground and Monaco workers share an embedder policy', () => {
  assert.deepEqual(isolationHeadersFor(productionConfig, '/playground/ssr'), {
    'Cross-Origin-Embedder-Policy': 'credentialless',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
  })
  assert.deepEqual(
    isolationHeadersFor(productionConfig, '/monacoworkers/ts.worker.bundle.js'),
    {
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Resource-Policy': 'same-origin',
    },
  )
  const workerEmbedderRoutes = matchingRoutesFor(
    productionConfig,
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

test('only the canary deployment blocks search indexing', () => {
  assert.equal(
    headersFor(productionConfig, '/get-started/getting-started')[
      'X-Robots-Tag'
    ],
    undefined,
  )
  assert.equal(
    headersFor(canaryConfig, '/get-started/getting-started')['X-Robots-Tag'],
    'noindex, nofollow',
  )
})

test('production and canary call the shared deployment with separate projects', () => {
  assert.match(
    productionWorkflow,
    /uses: \.\/\.github\/workflows\/deploy-website-build\.yml/,
  )
  assert.match(productionWorkflow, /channel: production/)
  assert.match(
    productionWorkflow,
    /vercel_project_id: \$\{\{ secrets\.VERCEL_WEBSITE_PROJECT_ID \}\}/,
  )

  assert.match(
    canaryWorkflow,
    /uses: \.\/\.github\/workflows\/deploy-website-build\.yml/,
  )
  assert.match(canaryWorkflow, /channel: canary/)
  assert.match(canaryWorkflow, /hostname: canary\.foldkit\.dev/)
  assert.match(
    canaryWorkflow,
    /vercel_project_id: \$\{\{ secrets\.VERCEL_WEBSITE_CANARY_PROJECT_ID \}\}/,
  )
  for (const workflow of [productionWorkflow, canaryWorkflow]) {
    assert.match(
      workflow,
      /website_book_font: \$\{\{ secrets\.ABC_FAVORIT_BOOK_WOFF2_BASE64 \}\}/,
    )
    assert.match(
      workflow,
      /website_light_font: \$\{\{ secrets\.ABC_FAVORIT_LIGHT_WOFF2_BASE64 \}\}/,
    )
  }
})

test('the canary hostname moves only after its staged deployment passes smoke tests', () => {
  const smokeIndex = buildWorkflow.indexOf(
    'Smoke the deployed SSR and SSG playgrounds',
  )
  const promotionIndex = buildWorkflow.indexOf('Promote the canary deployment')

  assert.notEqual(smokeIndex, -1)
  assert.notEqual(promotionIndex, -1)
  assert.ok(smokeIndex < promotionIndex)
  assert.match(buildWorkflow, /deploy --prebuilt --prod --skip-domain --token/)
  assert.match(buildWorkflow, /promote "\$DEPLOYMENT_URL" --yes --token/)
  assert.match(
    buildWorkflow,
    /- name: Verify the playground versions and peer ranges are published\n\s+if: inputs\.channel == 'production'/,
  )
})
