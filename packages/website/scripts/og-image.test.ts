import { Array, Option } from 'effect'
import { describe, expect, it } from 'vitest'

import { maybePostCover } from '../src/page/blog/frontmatter'
import { BlogPostRoute, HomeRoute } from '../src/route'
import { blogPosts } from './blogPosts'
import { injectMetaTags } from './og-image'

const resolveApiModuleName = (slug: string) => slug

const baseHtml = `<html><head>
    <title>Foldkit</title>
    <link rel="canonical" href="https://foldkit.dev" />
    <meta name="description" content="base" />
    <meta property="og:url" content="base" />
    <meta property="og:title" content="base" />
    <meta property="og:description" content="base" />
    <meta property="og:image" content="base" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="base" />
    <meta name="twitter:title" content="base" />
    <meta name="twitter:description" content="base" />
    <meta name="twitter:image" content="base" />
  </head><body></body></html>`

const coverPost = Option.getOrThrowWith(
  Array.findFirst(blogPosts, ({ frontmatter }) =>
    Option.isSome(maybePostCover(frontmatter)),
  ),
  () => new Error('No blog post declares a cover image.'),
)

const coverlessPost = Option.getOrThrowWith(
  Array.findFirst(blogPosts, ({ frontmatter }) =>
    Option.isNone(maybePostCover(frontmatter)),
  ),
  () => new Error('Every blog post declares a cover image.'),
)

describe('injectMetaTags', () => {
  describe('a blog post with a cover', () => {
    const route = BlogPostRoute({ postSlug: coverPost.slug })
    const urlPath = `/blog/${coverPost.slug}`
    const ogSlug = `blog-${coverPost.slug}`

    const html = injectMetaTags(
      baseHtml,
      route,
      urlPath,
      resolveApiModuleName,
      {
        [ogSlug]: { width: 1200, height: 800 },
      },
    )

    it('keeps the og image at the generated PNG path', () => {
      expect(html).toContain(
        `property="og:image" content="https://foldkit.dev/og/${ogSlug}.png"`,
      )
      expect(html).toContain(
        `name="twitter:image" content="https://foldkit.dev/og/${ogSlug}.png"`,
      )
    })

    it('reports the generated image dimensions', () => {
      expect(html).toContain('property="og:image:width" content="1200"')
      expect(html).toContain('property="og:image:height" content="800"')
    })

    it('uses the cover alt text for og:image:alt', () => {
      const cover = Option.getOrThrow(maybePostCover(coverPost.frontmatter))
      expect(html).toContain(`property="og:image:alt" content="${cover.alt}"`)
    })
  })

  describe('a blog post without a cover', () => {
    const route = BlogPostRoute({ postSlug: coverlessPost.slug })
    const urlPath = `/blog/${coverlessPost.slug}`

    const html = injectMetaTags(
      baseHtml,
      route,
      urlPath,
      resolveApiModuleName,
      {},
    )

    it('falls back to the full title for og:image:alt', () => {
      expect(html).toContain(
        `property="og:image:alt" content="${coverlessPost.frontmatter.title} - Foldkit | Effect-TS Frontend Framework"`,
      )
    })

    it('falls back to the satori card dimensions', () => {
      expect(html).toContain('property="og:image:width" content="1200"')
      expect(html).toContain('property="og:image:height" content="630"')
    })
  })

  describe('a route outside the blog', () => {
    const html = injectMetaTags(
      baseHtml,
      HomeRoute(),
      '/',
      resolveApiModuleName,
      {
        home: { width: 1200, height: 630 },
      },
    )

    it('uses the full title for og:image:alt and the satori card dimensions', () => {
      expect(html).toContain(
        'property="og:image:alt" content="Foldkit - TypeScript Frontend Framework Built on Effect-TS | Elm Architecture"',
      )
      expect(html).toContain('property="og:image:width" content="1200"')
      expect(html).toContain('property="og:image:height" content="630"')
    })
  })
})
