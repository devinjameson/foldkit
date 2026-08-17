import { request as nodeRequest } from 'node:http'
import { createServer as createNetServer } from 'node:net'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import { describe, expect, it, onTestFinished } from 'vitest'

import { foldkitSsr } from '../src/ssr.ts'

type RawResponse = Readonly<{ status: number; body: string }>

// `fetch` normalizes a URL before sending it, so a request target that is not
// origin-form (an absolute URL, or a network-path reference such as
// `//evil.example/page`) can only be sent by writing it into the request line
// directly.
const requestWithTarget = (
  origin: string,
  target: string,
  options: Readonly<{ method?: string; headers?: Record<string, string> }> = {},
): Promise<RawResponse> =>
  new Promise((resolveResponse, reject) => {
    const { hostname, port } = new URL(origin)
    const clientRequest = nodeRequest(
      {
        hostname,
        port,
        path: target,
        method: options.method ?? 'GET',
        headers: options.headers ?? {},
      },
      response => {
        let body = ''
        response.setEncoding('utf8')
        response.on('data', chunk => {
          body += chunk
        })
        response.on('end', () =>
          resolveResponse({ status: response.statusCode ?? 0, body }),
        )
      },
    )
    clientRequest.on('error', reject)
    clientRequest.end()
  })

const FIXTURE_ROOT = resolve(import.meta.dirname, 'fixtures/ssr')

const findFreePort = () =>
  new Promise<number>((resolvePort, reject) => {
    const probe = createNetServer()
    probe.on('error', error => {
      probe.close()
      reject(error)
    })
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address()
      if (address === null || typeof address === 'string') {
        probe.close()
        reject(new Error('Could not determine a free port'))
        return
      }
      probe.close(() => resolvePort(address.port))
    })
  })

const startServer = async (
  options: Readonly<{ origin?: string; allowedHosts?: true }> = {},
) => {
  const port = await findFreePort()
  const server = await createServer({
    root: FIXTURE_ROOT,
    configFile: false,
    logLevel: 'silent',
    plugins: [
      foldkitSsr({
        serverEntry: '/entry.server.ts',
        ...(options.origin === undefined ? {} : { origin: options.origin }),
      }),
    ],
    server: {
      host: '127.0.0.1',
      port,
      strictPort: true,
      ...(options.allowedHosts === undefined
        ? {}
        : { allowedHosts: options.allowedHosts }),
    },
  })
  onTestFinished(() => server.close().catch(() => undefined))
  await server.listen()
  return `http://127.0.0.1:${port}`
}

describe('foldkitSsr', () => {
  it('injects Rendered results and preserves their HTTP metadata', async () => {
    const origin = await startServer()
    const response = await fetch(`${origin}/rendered`, {
      headers: { accept: 'text/html' },
    })

    expect(response.status).toBe(203)
    expect(response.headers.get('x-rendered')).toBe('yes')
    expect(response.headers.getSetCookie()).toEqual([
      'first=1; Path=/',
      'second=2; Path=/',
    ])
    expect(await response.text()).toContain(
      '<main data-foldkit-app="app">/rendered</main>',
    )
  })

  it('passes the request body to Responded handlers', async () => {
    const origin = await startServer()
    const response = await fetch(`${origin}/echo`, {
      method: 'POST',
      body: 'payload',
    })

    expect(response.status).toBe(202)
    expect(response.headers.get('x-response')).toBe('echo')
    expect(await response.text()).toBe('POST:payload')
  })

  it('passes complete redirect responses through', async () => {
    const origin = await startServer()
    const response = await fetch(`${origin}/redirect`, {
      headers: { accept: 'text/html' },
      redirect: 'manual',
    })

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(`${origin}/rendered`)
  })

  it('renders for clients that accept anything, matching a production host', async () => {
    const origin = await startServer()
    const response = await fetch(`${origin}/rendered`, {
      headers: { accept: '*/*' },
    })

    expect(response.status).toBe(203)
    expect(await response.text()).toContain('data-foldkit-app="app"')
  })

  it('renders a template request regardless of Accept, matching a production host', async () => {
    const origin = await startServer()
    const response = await fetch(`${origin}/index.html`, {
      headers: { accept: 'application/json' },
    })

    expect(response.status).toBe(203)
    expect(await response.text()).toContain('data-foldkit-app="app"')
  })

  it('marks an Accept-negotiated deep route with Vary: Accept', async () => {
    const origin = await startServer()
    const response = await fetch(`${origin}/rendered`, {
      headers: { accept: 'text/html' },
    })

    expect((response.headers.get('vary') ?? '').toLowerCase()).toContain(
      'accept',
    )
  })

  it('does not add Accept to the Vary of a template request', async () => {
    const origin = await startServer()
    const response = await fetch(`${origin}/index.html`, {
      headers: { accept: 'text/html' },
    })

    expect((response.headers.get('vary') ?? '').toLowerCase()).not.toContain(
      'accept',
    )
  })

  it('does not render for a client that refuses HTML with q=0', async () => {
    const origin = await startServer()
    const response = await fetch(`${origin}/rendered`, {
      headers: { accept: 'text/html;q=0' },
    })

    expect(response.status).not.toBe(203)
    expect(await response.text()).not.toContain('data-foldkit-app')
  })

  it('varies the refused-HTML deep route 404 on Accept', async () => {
    const origin = await startServer()
    const response = await fetch(`${origin}/rendered`, {
      headers: { accept: 'text/html;q=0' },
    })

    expect(response.status).toBe(404)
    expect((response.headers.get('vary') ?? '').toLowerCase()).toContain(
      'accept',
    )
  })

  it('resolves relative template assets against the template on nested routes', async () => {
    const origin = await startServer()
    const response = await fetch(`${origin}/deep/nested`, {
      headers: { accept: 'text/html' },
    })

    const html = await response.text()
    expect(html).toContain('src="/entry.client.ts"')
    expect(html).not.toContain('src="./entry.client.ts"')
  })

  it('does not send a body for HEAD requests', async () => {
    const origin = await startServer()
    const response = await fetch(`${origin}/rendered`, {
      method: 'HEAD',
      headers: { accept: 'text/html' },
    })

    expect(response.status).toBe(203)
    expect(await response.text()).toBe('')
  })

  it('hands the entry the configured origin for an ordinary request', async () => {
    const origin = await startServer()
    const response = await requestWithTarget(origin, '/request-info')

    expect(response.status).toBe(200)
    expect(response.body).toBe(`${origin}/request-info`)
  })

  it('ignores the Host header when deciding the origin the entry sees', async () => {
    // Vite accepts IP-literal Host values by default, and any name at all under
    // `allowedHosts`. None of them may name the origin an entry builds
    // redirects, canonical URLs, or cookie domains from.
    const origin = await startServer()
    for (const host of ['203.0.113.10', '127.0.0.2', '[::1]']) {
      const response = await requestWithTarget(origin, '/request-info', {
        headers: { host },
      })

      expect(response.status, host).toBe(200)
      expect(response.body, host).toBe(`${origin}/request-info`)
    }
  })

  it('ignores an allowed hostile Host header', async () => {
    const origin = await startServer({ allowedHosts: true })
    const response = await requestWithTarget(origin, '/request-info', {
      headers: { host: 'evil.example' },
    })

    expect(response.status).toBe(200)
    expect(response.body).toBe(`${origin}/request-info`)
  })

  it('serves the origin the plugin was configured with', async () => {
    // The deployment-controlled origin, for a dev server behind a proxy or TLS
    // terminator that serves a different public origin.
    const origin = await startServer({
      origin: 'https://app.example',
      allowedHosts: true,
    })
    const response = await requestWithTarget(origin, '/request-info', {
      headers: { host: 'evil.example' },
    })

    expect(response.status).toBe(200)
    expect(response.body).toBe('https://app.example/request-info')
  })

  it('refuses a target that names another origin than the configured one', async () => {
    const origin = await startServer({
      origin: 'https://app.example',
      allowedHosts: true,
    })
    const response = await requestWithTarget(
      origin,
      'https://evil.example/request-info',
      { headers: { host: 'app.example' } },
    )

    expect(response.status).toBe(400)
  })

  it('refuses a network-path request target rather than adopting its origin', async () => {
    // `//evil.example/request-info` resolves against the host origin to
    // `http://evil.example/request-info`. An entry that builds redirects,
    // canonical URLs, or tenant selection from `Request.url` would take them
    // from the request, so the target is refused before the entry runs.
    const origin = await startServer()
    const response = await requestWithTarget(
      origin,
      '//evil.example/request-info',
    )

    expect(response.status).toBe(400)
    expect(response.body).not.toContain('evil.example')
  })

  it('refuses an absolute-form request target that names another origin', async () => {
    const origin = await startServer()
    const response = await requestWithTarget(
      origin,
      'http://evil.example/request-info',
    )

    expect(response.status).toBe(400)
    expect(response.body).not.toContain('evil.example')
  })

  it('never renders a request carrying a hostile Host header', async () => {
    // Vite refuses an unrecognized Host with 403 before this middleware sees
    // it, and the origin guard would refuse the target after. Either way the
    // entry never runs with an origin the client chose.
    const origin = await startServer()
    const response = await requestWithTarget(
      origin,
      '//evil.example/request-info',
      { headers: { host: 'evil.example' } },
    )

    expect([400, 403]).toContain(response.status)
    expect(response.body).not.toContain('evil.example/request-info')
  })

  it('serves an absolute-form target that names the host origin', async () => {
    const origin = await startServer()
    const response = await requestWithTarget(origin, `${origin}/request-info`, {
      headers: { host: new URL(origin).host },
    })

    expect(response.status).toBe(200)
    expect(response.body).toBe(`${origin}/request-info`)
  })

  it('returns 404 rather than HTML for a missing asset', async () => {
    // A browser fetches scripts with `Accept: */*`, which accepts HTML. Without
    // an asset classification, a hashed asset from a previous deployment would
    // be answered with the app shell at 200 and read as a blank page.
    const origin = await startServer()
    const response = await fetch(`${origin}/assets/stale-hash.js`, {
      headers: { accept: '*/*' },
    })

    expect(response.status).toBe(404)
    expect(await response.text()).not.toContain('data-foldkit-app')
  })

  it('returns 404 for missing stylesheets, source maps, and images', async () => {
    const origin = await startServer()
    for (const path of [
      '/assets/stale-hash.css',
      '/assets/stale-hash.js.map',
      '/assets/missing.png',
    ]) {
      const response = await fetch(`${origin}${path}`, {
        headers: { accept: '*/*' },
      })
      expect(response.status).toBe(404)
    }
  })

  it('returns 404 for a missing asset requested as a subresource', async () => {
    const origin = await startServer()
    const response = await fetch(`${origin}/deep/stale-chunk`, {
      headers: { accept: '*/*', 'sec-fetch-dest': 'script' },
    })

    expect(response.status).toBe(404)
    expect(await response.text()).not.toContain('data-foldkit-app')
  })

  it('returns 404 for a missing asset requested with HEAD', async () => {
    const origin = await startServer()
    const response = await fetch(`${origin}/assets/stale-hash.js`, {
      method: 'HEAD',
      headers: { accept: '*/*' },
    })

    expect(response.status).toBe(404)
  })

  it('declares both negotiated headers on every outcome, in either request order', async () => {
    // A shared cache keys on the headers a response declares. Both requests
    // carry the same Accept and differ only in Sec-Fetch-Dest, so an outcome
    // that declared only Accept could be served to the other kind of request:
    // the 404 for a real page, or the page for a script request.
    const origin = await startServer()

    const scriptFirst = await fetch(`${origin}/deep/stale-chunk`, {
      headers: { accept: '*/*', 'sec-fetch-dest': 'script' },
    })
    expect(scriptFirst.status).toBe(404)
    const scriptVary = (scriptFirst.headers.get('vary') ?? '').toLowerCase()
    expect(scriptVary).toContain('sec-fetch-dest')
    expect(scriptVary).toContain('accept')

    const documentSecond = await fetch(`${origin}/deep/stale-chunk`, {
      headers: { accept: '*/*', 'sec-fetch-dest': 'document' },
    })
    expect(documentSecond.status).toBe(203)
    const documentVary = (
      documentSecond.headers.get('vary') ?? ''
    ).toLowerCase()
    expect(documentVary).toContain('sec-fetch-dest')
    expect(documentVary).toContain('accept')
    expect(await documentSecond.text()).toContain('data-foldkit-app')
  })

  it('declares both negotiated headers when the document is requested first', async () => {
    const origin = await startServer()

    const documentFirst = await fetch(`${origin}/deep/other-chunk`, {
      headers: { accept: '*/*', 'sec-fetch-dest': 'document' },
    })
    expect(documentFirst.status).toBe(203)
    expect((documentFirst.headers.get('vary') ?? '').toLowerCase()).toContain(
      'sec-fetch-dest',
    )

    const scriptSecond = await fetch(`${origin}/deep/other-chunk`, {
      headers: { accept: '*/*', 'sec-fetch-dest': 'script' },
    })
    expect(scriptSecond.status).toBe(404)
    expect((scriptSecond.headers.get('vary') ?? '').toLowerCase()).toContain(
      'sec-fetch-dest',
    )
  })

  it('preserves existing Vary fields on a negotiated refusal', async () => {
    const origin = await startServer()
    const response = await fetch(`${origin}/deep/stale-chunk`, {
      headers: { accept: '*/*', 'sec-fetch-dest': 'script' },
    })

    const vary = (response.headers.get('vary') ?? '').toLowerCase()
    expect(vary).toContain('sec-fetch-dest')
    expect(vary).toContain('origin')
  })

  it('does not vary a refusal the path alone settles', async () => {
    // `/assets/stale-hash.js` is an asset for every client, so the refusal is
    // the same for all of them and needs no variance.
    const origin = await startServer()
    const response = await fetch(`${origin}/assets/stale-hash.js`, {
      headers: { accept: '*/*', 'sec-fetch-dest': 'script' },
    })

    expect(response.status).toBe(404)
    expect((response.headers.get('vary') ?? '').toLowerCase()).not.toContain(
      'sec-fetch-dest',
    )
  })

  it('still renders a deep route that accepts anything', async () => {
    const origin = await startServer()
    const response = await fetch(`${origin}/rendered`, {
      headers: { accept: '*/*', 'sec-fetch-dest': 'document' },
    })

    expect(response.status).toBe(203)
    expect(await response.text()).toContain('data-foldkit-app')
  })
})
