import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const sharedResponseHeaders = channel => {
  if (channel === 'production') {
    return {
      'Cross-Origin-Resource-Policy': 'same-origin',
    }
  } else {
    return {
      'Cross-Origin-Resource-Policy': 'same-origin',
      'X-Robots-Tag': 'noindex, nofollow',
    }
  }
}

const NEGOTIATED_VARY = 'Accept, Accept-Encoding'

const markdownResponseHeaders = {
  'Content-Type': 'text/markdown; charset=utf-8',
  Vary: NEGOTIATED_VARY,
}

const acceptsMediaType = mediaType => [
  { type: 'header', key: 'accept', value: `.*${mediaType}.*` },
]

// NOTE: Newsletter and the playground editor render as HTML only; every other
// extensionless page has a prerendered `.md` sibling. Excluding the two here
// lets an `Accept: text/markdown` request for them fall back to HTML instead
// of turning an existing page into a 404. `/404` is excluded so the error
// document is never served with a 200 status.
const MARKDOWN_PAGE_PATTERN =
  '^/(?!playground(?:/|$)|newsletter(?:/|$)|404(?:/|$))([^.]+?)/?$'

// NOTE: OG cards and blog post images render on other origins by design:
// share-preview testers hotlink the card, and feed readers hotlink the RSS
// enclosure and article images. The blanket same-origin resource policy makes
// browsers refuse those loads, so these paths override it. Later `continue`
// routes win when both match, so the override must sit after the blanket
// route.
const EMBEDDABLE_IMAGE_PATTERN =
  '^/(?:og/.*\\.png|blog/.*\\.(?:avif|gif|jpe?g|png|svg|webp))$'

export const websiteVercelConfig = channel => {
  if (channel !== 'production' && channel !== 'canary') {
    throw new Error(`Unknown website deployment channel: ${channel}`)
  }

  return {
    version: 3,
    routes: [
      {
        src: '^/og/(.*)\\.png$',
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        },
        continue: true,
      },
      {
        src: '^/$',
        headers: {
          Link: '</sitemap.xml>; rel="sitemap", </get-started/manifesto>; rel="about", </get-started/getting-started>; rel="help", </example-apps>; rel="related", </ai/overview>; rel="describedby", </openapi.json>; rel="service-desc"',
        },
        continue: true,
      },
      {
        src: '^/.+\\.md$',
        headers: {
          ...markdownResponseHeaders,
          'Cache-Control': 'public, max-age=0, must-revalidate',
        },
        continue: true,
      },
      {
        src: '^/\\.well-known/mcp$',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        continue: true,
      },
      {
        src: '^/playground/.*',
        headers: {
          'Cross-Origin-Embedder-Policy': 'credentialless',
          'Cross-Origin-Opener-Policy': 'same-origin',
        },
        continue: true,
      },
      {
        src: '^/monacoworkers/.*',
        headers: {
          'Cross-Origin-Embedder-Policy': 'credentialless',
        },
        continue: true,
      },
      {
        src: '.*',
        headers: sharedResponseHeaders(channel),
        continue: true,
      },
      {
        src: EMBEDDABLE_IMAGE_PATTERN,
        headers: {
          'Cross-Origin-Resource-Policy': 'cross-origin',
        },
        continue: true,
      },
      {
        src: '^/assets/(.*)',
        headers: {
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
        continue: true,
      },
      {
        src: '^/([^.]*)$',
        headers: {
          'Cache-Control': 'public, max-age=0, must-revalidate',
          Vary: NEGOTIATED_VARY,
        },
        continue: true,
      },
      {
        src: '^/developers/?$',
        status: 308,
        headers: { Location: '/ai/overview' },
      },
      {
        src: '^/manifesto$',
        status: 308,
        headers: { Location: '/get-started/manifesto' },
      },
      {
        src: '^/manifesto\\.md$',
        status: 308,
        headers: { Location: '/get-started/manifesto.md' },
      },
      {
        src: '^/getting-started$',
        status: 308,
        headers: { Location: '/get-started/getting-started' },
      },
      {
        src: '^/getting-started\\.md$',
        status: 308,
        headers: { Location: '/get-started/getting-started.md' },
      },
      {
        src: '^/why-no-jsx$',
        status: 308,
        headers: { Location: '/faq/why-no-jsx' },
      },
      {
        src: '^/why-no-jsx\\.md$',
        status: 308,
        headers: { Location: '/faq/why-no-jsx.md' },
      },
      {
        src: '^/what-about-ssr$',
        status: 308,
        headers: { Location: '/core/server-rendering' },
      },
      {
        src: '^/what-about-ssr\\.md$',
        status: 308,
        headers: { Location: '/core/server-rendering.md' },
      },
      {
        src: '^/faq/what-about-ssr$',
        status: 308,
        headers: { Location: '/core/server-rendering' },
      },
      {
        src: '^/faq/what-about-ssr\\.md$',
        status: 308,
        headers: { Location: '/core/server-rendering.md' },
      },
      {
        src: '^/coming-from-react$',
        status: 308,
        headers: { Location: '/react/coming-from-react' },
      },
      {
        src: '^/coming-from-react\\.md$',
        status: 308,
        headers: { Location: '/react/coming-from-react.md' },
      },
      {
        src: '^/foldkit-vs-react-side-by-side$',
        status: 308,
        headers: { Location: '/react/foldkit-vs-react-side-by-side' },
      },
      {
        src: '^/foldkit-vs-react-side-by-side\\.md$',
        status: 308,
        headers: { Location: '/react/foldkit-vs-react-side-by-side.md' },
      },
      {
        src: '^/routing-and-navigation$',
        status: 308,
        headers: { Location: '/core/routing-and-navigation' },
      },
      {
        src: '^/routing-and-navigation\\.md$',
        status: 308,
        headers: { Location: '/core/routing-and-navigation.md' },
      },
      {
        src: '^/field-validation$',
        status: 308,
        headers: { Location: '/core/field-validation' },
      },
      {
        src: '^/field-validation\\.md$',
        status: 308,
        headers: { Location: '/core/field-validation.md' },
      },
      {
        src: '^/project-organization$',
        status: 308,
        headers: { Location: '/patterns/project-organization' },
      },
      {
        src: '^/project-organization\\.md$',
        status: 308,
        headers: { Location: '/patterns/project-organization.md' },
      },
      {
        src: '^/example-apps/upload$',
        status: 308,
        headers: { Location: '/example-apps/interrupting-commands' },
      },
      {
        src: '^/playground/upload$',
        status: 308,
        headers: { Location: '/playground/interrupting-commands' },
      },
      {
        src: '^/example-apps/checkout-machine$',
        status: 308,
        headers: { Location: '/example-apps/state-machine' },
      },
      {
        src: '^/example-apps/checkout-machine\\.md$',
        status: 308,
        headers: { Location: '/example-apps/state-machine.md' },
      },
      {
        src: '^/playground/checkout-machine$',
        status: 308,
        headers: { Location: '/playground/state-machine' },
      },
      {
        src: '^/blog/foldkit-has-server-rendering-now$',
        status: 308,
        headers: { Location: '/blog/foldkit-has-server-rendering' },
      },
      {
        src: '^/blog/foldkit-has-server-rendering-now\\.md$',
        status: 308,
        headers: { Location: '/blog/foldkit-has-server-rendering.md' },
      },
      {
        src: '^/$',
        has: acceptsMediaType('text/markdown'),
        dest: '/index.md',
        headers: markdownResponseHeaders,
      },
      {
        src: MARKDOWN_PAGE_PATTERN,
        has: acceptsMediaType('text/markdown'),
        dest: '/$1.md',
        headers: markdownResponseHeaders,
      },
      { handle: 'filesystem' },
      {
        src: '/',
        has: [{ type: 'query', key: 'embedded', value: '(?<slug>[^&]+)' }],
        dest: '/example-apps-embed/$slug/index.html',
      },
      { src: '/playground/(.*)', dest: '/playground/index.html' },
      {
        src: '/(.*)',
        has: acceptsMediaType('application/json'),
        dest: '/404.json',
        status: 404,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Vary: NEGOTIATED_VARY,
        },
      },
      {
        src: '/(.*)',
        has: acceptsMediaType('text/html'),
        dest: '/404.html',
        status: 404,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          Vary: NEGOTIATED_VARY,
        },
      },
      {
        src: '/(.*)',
        dest: '/404.md',
        status: 404,
        headers: markdownResponseHeaders,
      },
    ],
  }
}

export const writeWebsiteVercelConfig = (channel, outputPath) => {
  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(
    outputPath,
    JSON.stringify(websiteVercelConfig(channel), null, 2) + '\n',
  )
}

const entryPath = process.argv.at(1)
if (
  entryPath !== undefined &&
  import.meta.url === pathToFileURL(resolve(entryPath)).href
) {
  const channel = process.argv.at(2)
  if (channel === undefined) {
    throw new Error('Pass the website deployment channel.')
  }
  writeWebsiteVercelConfig(
    channel,
    resolve(process.cwd(), '.vercel/output/config.json'),
  )
}
