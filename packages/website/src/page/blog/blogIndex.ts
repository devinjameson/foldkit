import { Array } from 'effect'
import { type Html, inertHtml as ih } from 'foldkit/html'

import { Icon } from '../../icon'
import { pageTitle, para } from '../../prose'
import { blogPostRouter } from '../../route'
import {
  BLOG_AUTHOR,
  BLOG_DESCRIPTION,
  BLOG_RSS_PATH,
  BLOG_TITLE,
} from './meta'
import { type BlogPost, formatPostDate, posts } from './posts'

// VIEW

const postEntry = (post: BlogPost): Html =>
  ih.keyed('article')(
    post.slug,
    [ih.Class('py-8 border-b border-gray-200 dark:border-gray-800')],
    [
      ih.p(
        [ih.Class('text-sm text-gray-500 dark:text-gray-400 mb-1')],
        [`${formatPostDate(post.frontmatter.date)} · ${BLOG_AUTHOR}`],
      ),
      ih.h2(
        [ih.Class('text-2xl font-normal mb-2')],
        [
          ih.a(
            [
              ih.Href(blogPostRouter({ postSlug: post.slug })),
              ih.Class(
                'text-gray-900 dark:text-white hover:text-accent-600 dark:hover:text-accent-400 transition',
              ),
            ],
            [post.frontmatter.title],
          ),
        ],
      ),
      ih.p(
        [ih.Class('text-gray-600 dark:text-gray-300 leading-relaxed')],
        [post.frontmatter.description],
      ),
      ih.a(
        [
          ih.Href(blogPostRouter({ postSlug: post.slug })),
          ih.Class(
            'inline-block mt-3 text-sm font-medium text-accent-600 dark:text-accent-400 hover:underline',
          ),
        ],
        ['Read more →'],
      ),
    ],
  )

const rssLink: Html = ih.a(
  [
    ih.Href(BLOG_RSS_PATH),
    ih.Target('_blank'),
    ih.Rel('noopener noreferrer'),
    ih.AriaLabel('RSS feed'),
    ih.Title('RSS feed'),
    ih.Class(
      'text-gray-500 dark:text-gray-400 hover:text-accent-600 dark:hover:text-accent-400 transition',
    ),
  ],
  [Icon.rss('w-5 h-5')],
)

export const view = (): Html =>
  ih.div(
    [],
    [
      ih.div(
        [ih.Class('flex items-baseline gap-3')],
        [pageTitle('blog', BLOG_TITLE), rssLink],
      ),
      para(BLOG_DESCRIPTION),
      ih.div([ih.Class('mt-4')], Array.map(posts, postEntry)),
    ],
  )
