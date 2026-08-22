import { Array, Option, Record, pipe } from 'effect'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const PUBLIC_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../public')

const readPublicFile = (relativePath: string): string =>
  readFileSync(resolve(PUBLIC_DIR, relativePath), 'utf8')

type OpenApiOperation = Readonly<{
  operationId?: string
  summary?: string
  description?: string
  responses?: Record<string, unknown>
}>

describe('openapi.json', () => {
  const spec = JSON.parse(readPublicFile('openapi.json'))

  const operations: ReadonlyArray<readonly [string, OpenApiOperation]> = pipe(
    Record.toEntries(spec.paths as Record<string, Record<string, unknown>>),
    Array.flatMap(([path, methods]) =>
      pipe(
        Record.toEntries(methods),
        Array.map(
          ([method, operation]) =>
            /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
            [
              `${method.toUpperCase()} ${path}`,
              operation as OpenApiOperation,
            ] as const,
        ),
      ),
    ),
  )

  it('declares OpenAPI 3.1 with the production server', () => {
    expect(spec.openapi).toBe('3.1.0')
    expect(spec.servers).toEqual([
      expect.objectContaining({ url: 'https://foldkit.dev' }),
    ])
  })

  it('gives every operation a unique operationId, a summary, and a description', () => {
    expect(operations.length).toBeGreaterThan(0)

    for (const [label, operation] of operations) {
      expect(operation.operationId, label).toBeTruthy()
      expect(operation.summary, label).toBeTruthy()
      expect(operation.description, label).toBeTruthy()
    }

    const ids = Array.map(operations, ([, operation]) => operation.operationId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('types every response and documents the JSON 404 body', () => {
    for (const [label, operation] of operations) {
      const responses = Record.toEntries(operation.responses ?? {})
      expect(responses.length, label).toBeGreaterThan(0)
      expect(
        Array.some(responses, ([status]) => status === '404'),
        label,
      ).toBe(true)
    }

    expect(
      spec.components.schemas.ErrorResponse.properties.error.required,
    ).toEqual(['code', 'status', 'message'])
  })

  it('covers the machine-readable surface the site actually serves', () => {
    const paths = Record.keys(spec.paths)
    for (const expected of [
      '/llms.txt',
      '/llms-full.txt',
      '/{page}.md',
      '/sitemap.xml',
      '/blog/rss.xml',
      '/openapi.json',
    ]) {
      expect(paths).toContain(expected)
    }
  })
})

describe('404 bodies', () => {
  it('the JSON 404 matches the ErrorResponse contract in openapi.json', () => {
    const body = JSON.parse(readPublicFile('404.json'))

    expect(body.error.code).toBe('not_found')
    expect(body.error.status).toBe(404)
    expect(body.error.message.length).toBeGreaterThan(0)
    expect(body.error.hints.length).toBeGreaterThan(0)
    expect(body.error.links.llms).toBe('https://foldkit.dev/llms.txt')
    expect(body.error.links.openapi).toBe('https://foldkit.dev/openapi.json')
  })

  it('the markdown 404 points agents at the discovery endpoints', () => {
    const body = readPublicFile('404.md')

    expect(body).toContain('# 404 Not Found')
    expect(body).toContain('https://foldkit.dev/llms.txt')
    expect(body).toContain('https://foldkit.dev/sitemap.xml')
    expect(body).toContain('https://foldkit.dev/openapi.json')
    expect(body).toContain('`.md`')
  })
})

describe('.well-known/mcp', () => {
  it('names the published MCP server and its transport', () => {
    const manifest = JSON.parse(readPublicFile('.well-known/mcp'))

    const maybeServer = Array.head(
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      manifest.servers as Array<{
        package: string
        transport: { type: string; command: string }
        registry: string
      }>,
    )
    expect(Option.isSome(maybeServer)).toBe(true)
    if (Option.isSome(maybeServer)) {
      expect(maybeServer.value.package).toBe('@foldkit/devtools-mcp')
      expect(maybeServer.value.transport.type).toBe('stdio')
      expect(maybeServer.value.transport.command).toBe('npx')
      expect(maybeServer.value.registry).toContain('npmjs.com')
    }
    expect(manifest.documentation).toBe('https://foldkit.dev/ai/mcp')
  })
})

describe('robots.txt', () => {
  it('keeps the agent digest pointers current', () => {
    const robots = readPublicFile('robots.txt')

    expect(robots).toContain('https://foldkit.dev/llms.txt')
    expect(robots).toContain('https://foldkit.dev/llms-full.txt')
    expect(robots).toContain('https://foldkit.dev/openapi.json')
    expect(robots).toContain('Sitemap: https://foldkit.dev/sitemap.xml')
  })
})
