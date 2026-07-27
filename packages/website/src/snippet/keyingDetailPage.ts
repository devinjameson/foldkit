import type { Html, HtmlBuilder } from 'foldkit/html'

// One function renders every article, so every article shares this
// function's identity. The key names which article is showing, so
// navigating replaces the old page instead of patching its DOM,
// scroll position included, into the next one
const articlePageView = (article: Article, h: HtmlBuilder<Message>): Html =>
  h.keyed('article')(
    article.slug,
    [],
    [h.h1([], [article.title]), h.p([], [article.body])],
  )
