import { Match, Option } from 'effect'
import { Html, type HtmlBuilder, inertHtml as ih } from 'foldkit/html'

import {
  docsFooterView,
  docsHeaderView,
  searchSubmodelView,
  searchWeight,
} from '../layout/docs'
import { type Message } from '../message'
import { type Model } from '../model'
import { Blog, NotFound } from '../page'
import { type BlogPostRoute, type BlogRoute, homeRouter } from '../route'
import * as Shared from './shared'
import * as Sidebar from './sidebar'

const PagefindBody = ih.DataAttribute('pagefind-body', '')
const PagefindIgnore = ih.DataAttribute('pagefind-ignore', '')

// VIEW

export const view = (
  model: Model,
  blogRoute: BlogRoute | BlogPostRoute,
  h: HtmlBuilder<Message>,
): Html => {
  const content = Match.value(blogRoute).pipe(
    Match.withReturnType<Html>(),
    Match.tagsExhaustive({
      Blog: () => Blog.BlogIndex.view(),
      BlogPost: ({ postSlug }) =>
        Option.match(Blog.findPostBySlug(postSlug), {
          onNone: () => NotFound.view(postSlug, homeRouter()),
          onSome: post => Blog.BlogPostPage.view(post, model.copiedSnippets, h),
        }),
    }),
  )

  const contentKey = Match.value(blogRoute).pipe(
    Match.tag('BlogPost', ({ postSlug }) => `BlogPost-${postSlug}`),
    Match.orElse(({ _tag }) => _tag),
  )

  return h.div(
    [h.Class('flex flex-col min-h-screen')],
    [
      Shared.skipNavLink,
      docsHeaderView(model, h),
      searchSubmodelView(model, h),
      Sidebar.mobileMenuView(model, h),
      h.main(
        [
          h.Id('main-content'),
          h.Class(
            'flex-1 flex flex-col pt-[var(--header-height)] bg-cream dark:bg-gray-900',
          ),
        ],
        [
          h.keyed('div')(
            contentKey,
            [
              PagefindBody,
              h.DataAttribute('pagefind-weight', searchWeight(blogRoute._tag)),
              h.Class(
                'flex-1 w-full px-4 py-6 md:px-6 2xl:py-10 max-w-3xl mx-auto min-w-0',
              ),
            ],
            [content],
          ),
          h.div([PagefindIgnore], [docsFooterView(model.currentYear, h)]),
        ],
      ),
    ],
  )
}
