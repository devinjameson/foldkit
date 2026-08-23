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

// NOTE: a minimal model of Vercel's routing phases: initial routes run in order
// (accumulating headers from `continue` routes, stopping on a redirect or a
// rewrite), the filesystem serves exact files and directory indexes, and the
// routes after `handle: filesystem` decide what a missing file becomes.
const DEPLOYED_FILES = new Set([
  'index.html',
  'index.md',
  '404.html',
  '404.md',
  '404.json',
  'core/model/index.html',
  'core/model.md',
  'newsletter/index.html',
  'playground/index.html',
  'playground/counter/index.html',
  'get-started/getting-started/index.html',
  'get-started/getting-started.md',
  'llms.txt',
  'llms-full.txt',
  'sitemap.xml',
  'openapi.json',
  '.well-known/mcp',
  'blog/rss.xml',
])

const splitPhases = routes => {
  const filesystemIndex = routes.findIndex(
    route => route.handle === 'filesystem',
  )
  assert.notEqual(filesystemIndex, -1)
  return {
    initial: routes.slice(0, filesystemIndex),
    postFilesystem: routes.slice(filesystemIndex + 1),
  }
}

const routeMatches = (route, pathname, accept) => {
  if (typeof route.src !== 'string') {
    return false
  }
  if (!new RegExp(route.src).test(pathname)) {
    return false
  }
  if (route.has === undefined) {
    return true
  }
  return route.has.every(
    condition =>
      condition.type === 'header' &&
      condition.key === 'accept' &&
      new RegExp(condition.value).test(accept),
  )
}

const applyDest = (route, pathname) => {
  const captures = new RegExp(route.src).exec(pathname)
  return route.dest.replace(/\$(\d)/g, (_, index) => captures[Number(index)])
}

const filesystemFileFor = pathname => {
  const relative = pathname.replace(/^\//, '')
  const directory = relative.replace(/\/$/, '')
  if (directory === '' && DEPLOYED_FILES.has('index.html')) {
    return 'index.html'
  }
  if (DEPLOYED_FILES.has(relative)) {
    return relative
  }
  if (DEPLOYED_FILES.has(`${directory}/index.html`)) {
    return `${directory}/index.html`
  }
  return undefined
}

const resolveRequest = (config, pathname, accept = '*/*') => {
  const { initial, postFilesystem } = splitPhases(config.routes)
  const headers = {}
  let currentPath = pathname

  for (const route of initial) {
    if (!routeMatches(route, currentPath, accept)) {
      continue
    }
    Object.assign(headers, route.headers)
    if (route.status !== undefined && route.dest === undefined) {
      return {
        kind: 'redirect',
        status: route.status,
        location: route.headers.Location,
      }
    }
    if (route.dest !== undefined) {
      currentPath = applyDest(route, currentPath)
      break
    }
    if (route.continue !== true) {
      break
    }
  }

  const initialMatch = filesystemFileFor(currentPath)
  if (initialMatch !== undefined) {
    return { kind: 'file', servedFile: initialMatch, status: 200, headers }
  }

  for (const route of postFilesystem) {
    if (!routeMatches(route, currentPath, accept)) {
      continue
    }
    Object.assign(headers, route.headers)
    if (route.dest !== undefined) {
      const servedFile = filesystemFileFor(applyDest(route, currentPath))
      assert.notEqual(
        servedFile,
        undefined,
        `Fallback dest ${route.dest} names a file the build does not emit.`,
      )
      return { kind: 'file', servedFile, status: route.status ?? 200, headers }
    }
    if (route.continue !== true) {
      break
    }
  }

  return { kind: 'miss', status: 404, headers }
}

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

test('unknown paths return a real 404 in the format the client asked for', () => {
  const asAgent = resolveRequest(
    productionConfig,
    '/some-path-that-does-not-exist',
  )
  assert.equal(asAgent.status, 404)
  assert.equal(asAgent.servedFile, '404.md')
  assert.equal(asAgent.headers['Content-Type'], 'text/markdown; charset=utf-8')

  const asBrowser = resolveRequest(
    productionConfig,
    '/some-path-that-does-not-exist',
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  )
  assert.equal(asBrowser.status, 404)
  assert.equal(asBrowser.servedFile, '404.html')

  const asJsonClient = resolveRequest(
    productionConfig,
    '/some-path-that-does-not-exist',
    'application/json',
  )
  assert.equal(asJsonClient.status, 404)
  assert.equal(asJsonClient.servedFile, '404.json')
  assert.equal(
    asJsonClient.headers['Content-Type'],
    'application/json; charset=utf-8',
  )
})

test('every 404 variant tells caches the response depends on Accept', () => {
  for (const accept of ['*/*', 'text/html', 'application/json']) {
    const result = resolveRequest(productionConfig, '/nope', accept)
    assert.equal(result.status, 404)
    assert.match(result.headers.Vary, /Accept\b/)
  }
})

test('Accept: text/markdown negotiates the markdown variant of a page', () => {
  const page = resolveRequest(productionConfig, '/core/model', 'text/markdown')
  assert.equal(page.status, 200)
  assert.equal(page.servedFile, 'core/model.md')
  assert.equal(page.headers['Content-Type'], 'text/markdown; charset=utf-8')
  assert.match(page.headers.Vary, /Accept\b/)

  const home = resolveRequest(productionConfig, '/', 'text/markdown')
  assert.equal(home.servedFile, 'index.md')
  assert.equal(home.headers['Content-Type'], 'text/markdown; charset=utf-8')

  const trailingSlash = resolveRequest(
    productionConfig,
    '/core/model/',
    'text/markdown',
  )
  assert.equal(trailingSlash.servedFile, 'core/model.md')
})

test('HTML page responses carry Vary: Accept so caches keep variants apart', () => {
  const page = resolveRequest(productionConfig, '/core/model', 'text/html')
  assert.equal(page.status, 200)
  assert.equal(page.servedFile, 'core/model/index.html')
  assert.match(page.headers.Vary, /Accept\b/)

  const markdownFile = resolveRequest(productionConfig, '/core/model.md')
  assert.equal(markdownFile.servedFile, 'core/model.md')
  assert.equal(
    markdownFile.headers['Content-Type'],
    'text/markdown; charset=utf-8',
  )
  assert.match(markdownFile.headers.Vary, /Accept\b/)
})

test('pages without a markdown variant fall back to HTML instead of 404', () => {
  for (const pathname of ['/newsletter', '/newsletter/']) {
    const newsletter = resolveRequest(
      productionConfig,
      pathname,
      'text/markdown',
    )
    assert.equal(newsletter.status, 200, pathname)
    assert.equal(newsletter.servedFile, 'newsletter/index.html', pathname)
  }

  const playground = resolveRequest(
    productionConfig,
    '/playground/counter',
    'text/markdown',
  )
  assert.equal(playground.status, 200)
  assert.equal(playground.servedFile, 'playground/counter/index.html')
})

test('a nonexistent .md path answers a browser with HTML, not markdown', () => {
  const result = resolveRequest(
    productionConfig,
    '/renamed-page.md',
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  )
  assert.equal(result.status, 404)
  assert.equal(result.servedFile, '404.html')
  assert.equal(result.headers['Content-Type'], 'text/html; charset=utf-8')
})

test('/404 never answers 200, whatever format the client asks for', () => {
  const asAgent = resolveRequest(productionConfig, '/404', 'text/markdown')
  assert.equal(asAgent.status, 404)
  assert.equal(asAgent.servedFile, '404.md')

  const asBrowser = resolveRequest(productionConfig, '/404', 'text/html')
  assert.equal(asBrowser.status, 404)
  assert.equal(asBrowser.servedFile, '404.html')
})

test('unknown playground slugs still load the shared editor shell', () => {
  const result = resolveRequest(productionConfig, '/playground/unknown-slug')
  assert.equal(result.status, 200)
  assert.equal(result.servedFile, 'playground/index.html')
})

test('the developer portal path redirects to the AI overview', () => {
  const result = resolveRequest(productionConfig, '/developers')
  assert.equal(result.kind, 'redirect')
  assert.equal(result.status, 308)
  assert.equal(result.location, '/ai/overview')
  assert.equal(
    resolveRequest(productionConfig, '/developers/').location,
    '/ai/overview',
  )
})

test('the MCP manifest and OpenAPI description are served as JSON', () => {
  const manifest = resolveRequest(productionConfig, '/.well-known/mcp')
  assert.equal(manifest.status, 200)
  assert.equal(manifest.servedFile, '.well-known/mcp')
  assert.equal(
    manifest.headers['Content-Type'],
    'application/json; charset=utf-8',
  )

  const spec = resolveRequest(productionConfig, '/openapi.json')
  assert.equal(spec.status, 200)
  assert.equal(spec.servedFile, 'openapi.json')
})

test('the homepage advertises the OpenAPI description in its Link header', () => {
  assert.match(
    headersFor(productionConfig, '/').Link,
    /<\/openapi\.json>; rel="service-desc"/,
  )
})

test('the deploy workflow copies dotfiles like .well-known into the Vercel output', () => {
  assert.match(
    buildWorkflow,
    /cp -r packages\/website\/dist\/\. \.vercel\/output\/static\//,
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

test('production deployment requires the complete promoted npm snapshot', () => {
  assert.match(
    buildWorkflow,
    /- name: Verify the complete promoted package release\n\s+if: inputs\.channel == 'production'\n\s+run: pnpm release:verify-latest/,
  )
})

test('stable finalization deploys the exact published website commit', () => {
  assert.match(
    productionWorkflow,
    /ref: \$\{\{ inputs\.published_commit \|\| 'main' \}\}/,
  )
  assert.match(
    productionWorkflow,
    /node scripts\/plan-website-deploy\.mjs "\$\{target\}" "\$\{PUBLISHED_COMMIT:\+--allow-historical-target\}"/,
  )
  assert.match(
    productionWorkflow,
    /git merge-base --is-ancestor "\$\{expected\}" refs\/remotes\/origin\/main/,
  )
  assert.match(
    productionWorkflow,
    /target: \$\{\{ needs\.authorize\.outputs\.target \}\}/,
  )
})

test('the registry-backed SSG playground build runs only for production', () => {
  assert.match(
    buildWorkflow,
    /- name: Build the exact transformed SSG playground\n\s+if: inputs\.channel == 'production'\n\s+run: pnpm check:playground-ssg-build/,
  )
})
