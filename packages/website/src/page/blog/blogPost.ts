import { Option } from 'effect'
import {
  type Html,
  type HtmlBuilder,
  createKeyedLazy,
  inertHtml as ih,
} from 'foldkit/html'

import { docPage } from '../../markdown'
import { type Message } from '../../message'
import { pageTitle } from '../../prose'
import { blogRouter } from '../../route'
import { type CopiedSnippets } from '../../view/codeBlock'
import { type PostCover, maybePostCover } from './frontmatter'
import { BLOG_AUTHOR } from './meta'
import { type BlogPost, formatPostDate } from './posts'

// VIEW

const backToBlogLink: Html = ih.a(
  [
    ih.Href(blogRouter()),
    ih.Class(
      'inline-block mb-6 text-sm font-medium text-accent-600 dark:text-accent-400 hover:underline',
    ),
  ],
  ['← Blog'],
)

const coverImageView = (cover: PostCover): Html =>
  ih.img([
    ih.Src(cover.src),
    ih.Alt(cover.alt),
    ih.Class('w-full rounded-lg mb-8'),
  ])

const postView = (
  post: BlogPost,
  copiedSnippets: CopiedSnippets,
  h: HtmlBuilder<Message>,
): Html =>
  ih.article(
    [],
    [
      backToBlogLink,
      ...Option.match(maybePostCover(post.frontmatter), {
        onNone: () => [],
        onSome: cover => [coverImageView(cover)],
      }),
      ih.header(
        [ih.Class('mb-8')],
        [
          pageTitle(post.slug, post.frontmatter.title),
          ih.p(
            [ih.Class('text-gray-500 dark:text-gray-400')],
            [`${formatPostDate(post.frontmatter.date)} · ${BLOG_AUTHOR}`],
          ),
        ],
      ),
      docPage(post.document, post.slug).view(copiedSnippets, h),
    ],
  )

const lazyPostView = createKeyedLazy()

export const view = (
  post: BlogPost,
  copiedSnippets: CopiedSnippets,
  h: HtmlBuilder<Message>,
): Html => lazyPostView(post.slug, postView, [post, copiedSnippets, h])
