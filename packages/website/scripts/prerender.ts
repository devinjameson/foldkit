import {
  Array,
  Console,
  DateTime,
  Effect,
  Match as M,
  Option,
  Record,
  Schema as S,
  String as String_,
  pipe,
} from 'effect'
import { FileSystem } from 'effect'
import { Server } from 'foldkit/experimental'
import { Window } from 'happy-dom'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

import { NodeRuntime, NodeServices } from '@effect/platform-node'

import type * as ServerEntry from '../src/entry.server'
import {
  type ApiModule,
  moduleNameToSlug,
  parseTypedocJson,
  slugToModuleName,
} from '../src/page/apiReference/domain'
import { TypeDocJson } from '../src/page/apiReference/typedoc'
import { BLOG_DESCRIPTION, BLOG_RSS_PATH } from '../src/page/blog/meta'
import { exampleSlugs } from '../src/page/example/meta'
import {
  AiMcpRoute,
  AiOverviewRoute,
  AiSkillsRoute,
  ApiModuleRoute,
  AppRoute,
  AsyncDataRoute,
  BestPracticesImmutabilityRoute,
  BestPracticesKeyingRoute,
  BestPracticesMessagesRoute,
  BestPracticesSideEffectsRoute,
  BlogPostRoute,
  BlogRoute,
  ComingFromReactRoute,
  ComingFromTanStackQueryRoute,
  CoreArchitectureRoute,
  CoreCanvasRoute,
  CoreCommandsRoute,
  CoreCounterExampleRoute,
  CoreCrashViewRoute,
  CoreCustomElementRoute,
  CoreDevToolsRoute,
  CoreDomRoute,
  CoreEmbeddingRoute,
  CoreFileRoute,
  CoreFreezeModelRoute,
  CoreHttpRoute,
  CoreInitAndFlagsRoute,
  CoreManagedResourcesRoute,
  CoreMessagesRoute,
  CoreModelRoute,
  CoreMountRoute,
  CorePreserveScrollRoute,
  CoreRenderRoute,
  CoreResourcesRoute,
  CoreRuntimeRoute,
  CoreServerRenderingRoute,
  CoreSlowWarningsRoute,
  CoreSubmodelRoute,
  CoreSubscriptionsRoute,
  CoreUpdateRoute,
  CoreViewMemoizationRoute,
  CoreViewRoute,
  CoreViewTransitionsRoute,
  EffectAtomComparisonRoute,
  ElmComparisonRoute,
  ExampleDetailRoute,
  ExamplesRoute,
  FieldValidationRoute,
  GettingStartedRoute,
  HomeRoute,
  ManifestoRoute,
  NewsletterRoute,
  PatternsInformingSubmodelsRoute,
  PatternsSubscriptionOrganizationRoute,
  PerformanceRoute,
  PlaygroundRoute,
  ProjectOrganizationRoute,
  ReactComparisonRoute,
  RoadmapRoute,
  RoutingAndNavigationRoute,
  TestingRoute,
  TestingSceneRoute,
  TestingStoryRoute,
  ToolingLintingRoute,
  TypingTerminalRoute,
  UiAnimationRoute,
  UiButtonRoute,
  UiCalendarRoute,
  UiCheckboxRoute,
  UiComboboxRoute,
  UiDatePickerRoute,
  UiDialogRoute,
  UiDisclosureRoute,
  UiDragAndDropRoute,
  UiFieldsetRoute,
  UiFileDropRoute,
  UiInputRoute,
  UiListboxRoute,
  UiMenuRoute,
  UiNavRoute,
  UiOverviewRoute,
  UiPopoverRoute,
  UiRadioGroupRoute,
  UiSelectRoute,
  UiSelectionSubmodelsRoute,
  UiSliderRoute,
  UiSwitchRoute,
  UiTabsRoute,
  UiTextareaRoute,
  UiToastRoute,
  UiTooltipRoute,
  UiVirtualListRoute,
  WhatAboutSsrRoute,
  WhyNoJsxRoute,
  aiMcpRouter,
  aiOverviewRouter,
  aiSkillsRouter,
  apiModuleRouter,
  asyncDataRouter,
  bestPracticesImmutabilityRouter,
  bestPracticesKeyingRouter,
  bestPracticesMessagesRouter,
  bestPracticesSideEffectsRouter,
  blogPostRouter,
  blogRouter,
  comingFromReactRouter,
  comingFromTanStackQueryRouter,
  coreArchitectureRouter,
  coreCanvasRouter,
  coreCommandsRouter,
  coreCounterExampleRouter,
  coreCrashViewRouter,
  coreCustomElementRouter,
  coreDevToolsRouter,
  coreDomRouter,
  coreEmbeddingRouter,
  coreFileRouter,
  coreFreezeModelRouter,
  coreHttpRouter,
  coreInitAndFlagsRouter,
  coreManagedResourcesRouter,
  coreMessagesRouter,
  coreModelRouter,
  coreMountRouter,
  corePreserveScrollRouter,
  coreRenderRouter,
  coreResourcesRouter,
  coreRuntimeRouter,
  coreServerRenderingRouter,
  coreSlowWarningsRouter,
  coreSubmodelRouter,
  coreSubscriptionsRouter,
  coreUpdateRouter,
  coreViewMemoizationRouter,
  coreViewRouter,
  coreViewTransitionsRouter,
  effectAtomComparisonRouter,
  elmComparisonRouter,
  exampleDetailRouter,
  examplesRouter,
  fieldValidationRouter,
  gettingStartedRouter,
  homeRouter,
  manifestoRouter,
  newsletterRouter,
  patternsInformingSubmodelsRouter,
  patternsSubscriptionOrganizationRouter,
  performanceRouter,
  playgroundRouter,
  projectOrganizationRouter,
  reactComparisonRouter,
  roadmapRouter,
  routingAndNavigationRouter,
  testingRouter,
  testingSceneRouter,
  testingStoryRouter,
  toolingLintingRouter,
  typingTerminalRouter,
  uiAnimationRouter,
  uiButtonRouter,
  uiCalendarRouter,
  uiCheckboxRouter,
  uiComboboxRouter,
  uiDatePickerRouter,
  uiDialogRouter,
  uiDisclosureRouter,
  uiDragAndDropRouter,
  uiFieldsetRouter,
  uiFileDropRouter,
  uiInputRouter,
  uiListboxRouter,
  uiMenuRouter,
  uiNavRouter,
  uiOverviewRouter,
  uiPopoverRouter,
  uiRadioGroupRouter,
  uiSelectRouter,
  uiSelectionSubmodelsRouter,
  uiSliderRouter,
  uiSwitchRouter,
  uiTabsRouter,
  uiTextareaRouter,
  uiToastRouter,
  uiTooltipRouter,
  uiVirtualListRouter,
  whatAboutSsrRouter,
  whyNoJsxRouter,
} from '../src/route'
import { type BlogPostEntry, blogPostSlugs, blogPosts } from './blogPosts'
import {
  type LlmsFullEntry,
  type LlmsIndexEntry,
  buildLlmsFull,
  buildLlmsIndex,
  extractMarkdownFromRenderedDocument,
  shouldExportMarkdown,
  urlPathToMarkdownPath,
} from './markdown'
import { type ApiModuleNameResolver, routeToMetadata } from './metadata'
import { generateOgImages, injectMetaTags } from './og-image'

// ROUTES

export const STATIC_ROUTES: ReadonlyArray<AppRoute> = [
  HomeRoute(),
  NewsletterRoute(),
  ManifestoRoute(),
  WhyNoJsxRoute(),
  WhatAboutSsrRoute(),
  PerformanceRoute(),
  GettingStartedRoute(),
  RoadmapRoute(),
  ComingFromReactRoute(),
  ComingFromTanStackQueryRoute(),
  ReactComparisonRoute(),
  EffectAtomComparisonRoute(),
  ElmComparisonRoute(),
  RoutingAndNavigationRoute(),
  FieldValidationRoute(),
  TestingRoute(),
  TestingStoryRoute(),
  TestingSceneRoute(),
  ExamplesRoute(),
  ...Array.map(exampleSlugs, slug => ExampleDetailRoute({ exampleSlug: slug })),
  TypingTerminalRoute(),
  BestPracticesSideEffectsRoute(),
  BestPracticesMessagesRoute(),
  BestPracticesKeyingRoute(),
  BestPracticesImmutabilityRoute(),
  ProjectOrganizationRoute(),
  ToolingLintingRoute(),
  CoreArchitectureRoute(),
  CoreCounterExampleRoute(),
  CoreModelRoute(),
  CoreMessagesRoute(),
  CoreUpdateRoute(),
  CoreViewRoute(),
  CoreCommandsRoute(),
  CoreMountRoute(),
  CoreCustomElementRoute(),
  CoreSubscriptionsRoute(),
  CoreInitAndFlagsRoute(),
  CoreDomRoute(),
  CoreRenderRoute(),
  CoreFileRoute(),
  CoreHttpRoute(),
  CoreCanvasRoute(),
  CoreRuntimeRoute(),
  CoreServerRenderingRoute(),
  CoreResourcesRoute(),
  CoreManagedResourcesRoute(),
  CoreDevToolsRoute(),
  CoreCrashViewRoute(),
  CoreViewTransitionsRoute(),
  CoreSlowWarningsRoute(),
  CoreFreezeModelRoute(),
  CorePreserveScrollRoute(),
  CoreSubmodelRoute(),
  AsyncDataRoute(),
  PatternsInformingSubmodelsRoute(),
  PatternsSubscriptionOrganizationRoute(),
  CoreViewMemoizationRoute(),
  CoreEmbeddingRoute(),
  UiOverviewRoute(),
  UiSelectionSubmodelsRoute(),
  UiTabsRoute(),
  UiNavRoute(),
  UiDisclosureRoute(),
  UiDialogRoute(),
  UiMenuRoute(),
  UiPopoverRoute(),
  UiListboxRoute(),
  UiRadioGroupRoute(),
  UiSelectRoute(),
  UiSliderRoute(),
  UiSwitchRoute(),
  UiButtonRoute(),
  UiCalendarRoute(),
  UiDatePickerRoute(),
  UiCheckboxRoute(),
  UiComboboxRoute(),
  UiInputRoute(),
  UiTextareaRoute(),
  UiFieldsetRoute(),
  UiDragAndDropRoute(),
  UiFileDropRoute(),
  UiToastRoute(),
  UiTooltipRoute(),
  UiAnimationRoute(),
  UiVirtualListRoute(),
  AiOverviewRoute(),
  AiSkillsRoute(),
  AiMcpRoute(),
  BlogRoute(),
  ...Array.map(blogPostSlugs, slug => BlogPostRoute({ postSlug: slug })),
]

export const routeToUrlPath = (route: AppRoute): string =>
  M.value(route).pipe(
    M.withReturnType<string>(),
    M.tagsExhaustive({
      Home: () => homeRouter(),
      Manifesto: () => manifestoRouter(),
      WhyNoJsx: () => whyNoJsxRouter(),
      WhatAboutSsr: () => whatAboutSsrRouter(),
      Performance: () => performanceRouter(),
      GettingStarted: () => gettingStartedRouter(),
      Roadmap: () => roadmapRouter(),
      ComingFromReact: () => comingFromReactRouter(),
      ComingFromTanStackQuery: () => comingFromTanStackQueryRouter(),
      ReactComparison: () => reactComparisonRouter(),
      EffectAtomComparison: () => effectAtomComparisonRouter(),
      ElmComparison: () => elmComparisonRouter(),
      RoutingAndNavigation: () => routingAndNavigationRouter(),
      FieldValidation: () => fieldValidationRouter(),
      Testing: () => testingRouter(),
      TestingStory: () => testingStoryRouter(),
      TestingScene: () => testingSceneRouter(),
      Examples: () => examplesRouter(),
      ExampleDetail: ({ exampleSlug }) => exampleDetailRouter({ exampleSlug }),
      TypingTerminal: () => typingTerminalRouter(),
      BestPracticesSideEffects: () => bestPracticesSideEffectsRouter(),
      BestPracticesMessages: () => bestPracticesMessagesRouter(),
      BestPracticesKeying: () => bestPracticesKeyingRouter(),
      BestPracticesImmutability: () => bestPracticesImmutabilityRouter(),
      ProjectOrganization: () => projectOrganizationRouter(),
      ToolingLinting: () => toolingLintingRouter(),
      CoreArchitecture: () => coreArchitectureRouter(),
      CoreCounterExample: () => coreCounterExampleRouter(),
      CoreModel: () => coreModelRouter(),
      CoreMessages: () => coreMessagesRouter(),
      CoreUpdate: () => coreUpdateRouter(),
      CoreView: () => coreViewRouter(),
      CoreCommands: () => coreCommandsRouter(),
      CoreMount: () => coreMountRouter(),
      CoreCustomElement: () => coreCustomElementRouter(),
      CoreSubscriptions: () => coreSubscriptionsRouter(),
      CoreInitAndFlags: () => coreInitAndFlagsRouter(),
      CoreDom: () => coreDomRouter(),
      CoreRender: () => coreRenderRouter(),
      CoreFile: () => coreFileRouter(),
      CoreHttp: () => coreHttpRouter(),
      CoreCanvas: () => coreCanvasRouter(),
      CoreRuntime: () => coreRuntimeRouter(),
      CoreServerRendering: () => coreServerRenderingRouter(),
      CoreResources: () => coreResourcesRouter(),
      CoreManagedResources: () => coreManagedResourcesRouter(),
      CoreDevTools: () => coreDevToolsRouter(),
      CoreCrashView: () => coreCrashViewRouter(),
      CoreViewTransitions: () => coreViewTransitionsRouter(),
      CoreSlowWarnings: () => coreSlowWarningsRouter(),
      CoreFreezeModel: () => coreFreezeModelRouter(),
      CorePreserveScroll: () => corePreserveScrollRouter(),
      CoreSubmodel: () => coreSubmodelRouter(),
      AsyncData: () => asyncDataRouter(),
      PatternsInformingSubmodels: () => patternsInformingSubmodelsRouter(),
      PatternsSubscriptionOrganization: () =>
        patternsSubscriptionOrganizationRouter(),
      CoreViewMemoization: () => coreViewMemoizationRouter(),
      CoreEmbedding: () => coreEmbeddingRouter(),
      UiOverview: () => uiOverviewRouter(),
      UiSelectionSubmodels: () => uiSelectionSubmodelsRouter(),
      UiTabs: () => uiTabsRouter(),
      UiNav: () => uiNavRouter(),
      UiDisclosure: () => uiDisclosureRouter(),
      UiDialog: () => uiDialogRouter(),
      UiMenu: () => uiMenuRouter(),
      UiPopover: () => uiPopoverRouter(),
      UiListbox: () => uiListboxRouter(),
      UiRadioGroup: () => uiRadioGroupRouter(),
      UiSelect: () => uiSelectRouter(),
      UiSlider: () => uiSliderRouter(),
      UiSwitch: () => uiSwitchRouter(),
      UiButton: () => uiButtonRouter(),
      UiCalendar: () => uiCalendarRouter(),
      UiDatePicker: () => uiDatePickerRouter(),
      UiCheckbox: () => uiCheckboxRouter(),
      UiCombobox: () => uiComboboxRouter(),
      UiInput: () => uiInputRouter(),
      UiTextarea: () => uiTextareaRouter(),
      UiFieldset: () => uiFieldsetRouter(),
      UiDragAndDrop: () => uiDragAndDropRouter(),
      UiFileDrop: () => uiFileDropRouter(),
      UiToast: () => uiToastRouter(),
      UiTooltip: () => uiTooltipRouter(),
      UiAnimation: () => uiAnimationRouter(),
      UiVirtualList: () => uiVirtualListRouter(),
      AiOverview: () => aiOverviewRouter(),
      AiSkills: () => aiSkillsRouter(),
      AiMcp: () => aiMcpRouter(),
      ApiModule: ({ moduleSlug }) => apiModuleRouter({ moduleSlug }),
      Playground: ({ exampleSlug }) => playgroundRouter({ exampleSlug }),
      Newsletter: () => newsletterRouter(),
      Blog: () => blogRouter(),
      BlogPost: ({ postSlug }) => blogPostRouter({ postSlug }),
      NotFound: () => '/',
    }),
  )

export const routeToOutputPath = (route: AppRoute): string => {
  const urlPath = routeToUrlPath(route)
  return urlPath === '/' ? 'index.html' : `${urlPath.slice(1)}/index.html`
}

export const enumerateRoutes = (
  apiModuleSlugs: ReadonlyArray<string>,
): ReadonlyArray<AppRoute> =>
  pipe(
    STATIC_ROUTES,
    Array.appendAll(
      Array.map(apiModuleSlugs, moduleSlug => ApiModuleRoute({ moduleSlug })),
    ),
  )

// PATHS

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const WEBSITE_DIR = resolve(SCRIPT_DIR, '..')
const DIST_DIR = resolve(WEBSITE_DIR, 'dist')
const API_JSON_PATH = resolve(WEBSITE_DIR, 'src/generated/api.json')
const API_UI_JSON_PATH = resolve(WEBSITE_DIR, 'src/generated/api-ui.json')

// SERVER ENTRY

const SERVER_ENTRY_PATH = resolve(WEBSITE_DIR, 'dist-server/entry.server.js')

// NOTE: the app module graph uses Vite-only specifiers (`virtual:*`, `.md`,
// `?raw`, `import.meta.glob`), so it cannot be imported by tsx directly. The
// `preprerender` script builds `src/entry.server.ts` with `vite build --ssr`
// first, and this dynamic import loads that bundle.
const loadServerEntry: Effect.Effect<typeof ServerEntry> = Effect.promise(
  () => import(pathToFileURL(SERVER_ENTRY_PATH).href),
)

type RenderedPage = Readonly<{
  application: Server.RenderedApplication
  markdown: string
}>

const API_SECTION_MARKER = 'data-pagefind-meta="section"'

const extractMarkdownFromHtml = (html: string): Effect.Effect<string> =>
  Effect.acquireUseRelease(
    Effect.sync(() => new Window()),
    window =>
      Effect.sync(() => {
        window.document.body.innerHTML = html
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        const renderedDocument = window.document as unknown as Document
        return extractMarkdownFromRenderedDocument(renderedDocument)
      }),
    window => Effect.promise(() => window.happyDOM.close()),
  )

const renderRoutePage = (serverEntry: typeof ServerEntry, route: AppRoute) =>
  Effect.gen(function* () {
    const urlPath = routeToUrlPath(route)
    const result = yield* Effect.promise(() =>
      serverEntry.renderPage(new Request(`${SITE_URL}${urlPath}`)),
    )
    if (result._tag === 'Responded') {
      return yield* Effect.fail(
        new Error(
          `The server entry returned a complete Response while prerendering ${urlPath}; static HTML generation requires a Rendered result.`,
        ),
      )
    }
    if (result.status !== undefined && result.status !== 200) {
      return yield* Effect.fail(
        new Error(
          `The server entry returned status ${result.status} while prerendering ${urlPath}; the static host cannot preserve that status in an HTML file.`,
        ),
      )
    }
    if (result.headers !== undefined) {
      return yield* Effect.fail(
        new Error(
          `The server entry returned response headers while prerendering ${urlPath}; the static host cannot preserve them in an HTML file.`,
        ),
      )
    }
    const rendered = result.application

    if (
      route._tag === 'ApiModule' &&
      !rendered.html.includes(API_SECTION_MARKER)
    ) {
      return yield* Effect.fail(
        new Error(
          `API module page ${urlPath} rendered without its section heading; ` +
            'the API data seeding in entry.server.ts has regressed.',
        ),
      )
    }

    const markdown = shouldExportMarkdown(route)
      ? yield* extractMarkdownFromHtml(rendered.html)
      : ''
    const renderedPage: RenderedPage = {
      application: rendered,
      markdown,
    }
    return renderedPage
  })

// PRERENDER

const ApiDocJson = S.fromJsonString(TypeDocJson)

// NOTE: The core and UI TypeDoc projects are merged here the same way
// vite.config.ts merges them for the client. Reading only api.json drops every
// Ui/* module, and with it every `ui-*` route from prerender, the sitemap, the
// Pagefind index, and per-page metadata.
const readApiModules = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const [coreRaw, uiRaw] = yield* Effect.all([
    fs.readFileString(API_JSON_PATH),
    fs.readFileString(API_UI_JSON_PATH),
  ])
  const coreApiDoc = yield* S.decodeUnknownEffect(ApiDocJson)(coreRaw)
  const uiApiDoc = yield* S.decodeUnknownEffect(ApiDocJson)(uiRaw)

  return parseTypedocJson({
    ...coreApiDoc,
    children: [...coreApiDoc.children, ...uiApiDoc.children],
  }).modules
})

type PrerenderResult = Readonly<{
  route: AppRoute
  urlPath: string
  markdown: string
  html: string
}>

const buildApiModuleNameResolver = (
  modules: ReadonlyArray<ApiModule>,
): ApiModuleNameResolver => {
  const nameBySlug = Record.fromIterableWith(modules, ({ name }) => [
    moduleNameToSlug(name),
    name,
  ])
  return slug =>
    pipe(
      nameBySlug,
      Record.get(slug),
      Option.getOrElse(() => slugToModuleName(slug)),
    )
}

const prerenderRoute =
  (
    serverEntry: typeof ServerEntry,
    baseHtml: string,
    resolveApiModuleName: ApiModuleNameResolver,
  ) =>
  (route: AppRoute) =>
    Effect.gen(function* () {
      const urlPath = routeToUrlPath(route)
      const outputPath = routeToOutputPath(route)
      const outputFilePath = resolve(DIST_DIR, outputPath)

      const captured = yield* renderRoutePage(serverEntry, route)
      const injectedHtml = Server.injectIntoTemplate(
        baseHtml,
        captured.application,
      )
      const outputHtml = injectMetaTags(
        injectedHtml,
        route,
        urlPath,
        resolveApiModuleName,
      )

      const fs = yield* FileSystem.FileSystem
      yield* fs.makeDirectory(dirname(outputFilePath), {
        recursive: true,
      })
      yield* fs.writeFileString(outputFilePath, outputHtml)

      if (shouldExportMarkdown(route) && captured.markdown.length > 0) {
        const markdownFilePath = resolve(
          DIST_DIR,
          urlPathToMarkdownPath(urlPath),
        )
        yield* fs.makeDirectory(dirname(markdownFilePath), {
          recursive: true,
        })
        yield* fs.writeFileString(markdownFilePath, captured.markdown)
      }

      yield* Console.log(`  ✓ ${urlPath}`)
      return Option.some<PrerenderResult>({
        route,
        urlPath,
        markdown: captured.markdown,
        html: captured.application.html,
      })
    }).pipe(
      Effect.catch(error =>
        Effect.as(
          Console.warn(`  ✗ ${routeToUrlPath(route)}: ${String(error)}`),
          Option.none<PrerenderResult>(),
        ),
      ),
    )

// PLAYGROUND SHELL

// NOTE: Playground routes are deliberately excluded from STATIC_ROUTES: the
// WebContainer editor can't be statically rendered per slug, and every entry
// into it is a full document load for cross-origin isolation. With no file of
// its own, Vercel's SPA catch-all serves the prerendered home page for
// `/playground/<slug>`, so the landing view flashes before the app boots and
// swaps in the editor. Instead, one canonical playground page renders through
// the server entry and `/playground/*` routes to it (see deploy-website.yml
// and the preview fallback in vite.config.ts), so the shell carries the
// `data-foldkit-app` stamp and the Flags payload that `Runtime.hydrate`
// requires. A visitor loading a different slug hydrates against this shell
// and the mismatching subtree rebuilds, the designed hydration fallback.
const PLAYGROUND_SHELL_ROUTE = PlaygroundRoute({ exampleSlug: 'counter' })

const PLAYGROUND_SHELL_OUTPUT_PATH = 'playground/index.html'

const prerenderPlaygroundShell = (
  serverEntry: typeof ServerEntry,
  baseHtml: string,
) =>
  Effect.gen(function* () {
    const captured = yield* renderRoutePage(serverEntry, PLAYGROUND_SHELL_ROUTE)
    const outputHtml = Server.injectIntoTemplate(baseHtml, captured.application)
    const outputFilePath = resolve(DIST_DIR, PLAYGROUND_SHELL_OUTPUT_PATH)

    const fs = yield* FileSystem.FileSystem
    yield* fs.makeDirectory(dirname(outputFilePath), { recursive: true })
    yield* fs.writeFileString(outputFilePath, outputHtml)

    yield* Console.log('  ✓ /playground/* shell')
  })

// SITEMAP

const SITE_URL = 'https://foldkit.dev'

const formatDateIso = (dateTime: DateTime.DateTime): string => {
  const { year, month, day } = DateTime.toPartsUtc(dateTime)
  return pipe(
    [String(year), String(month), String(day)],
    Array.map(String_.padStart(2, '0')),
    Array.join('-'),
  )
}

const routeToSitemapEntry = (lastModification: string) => (route: AppRoute) => {
  const urlPath = routeToUrlPath(route)
  return `<url>
  <loc>${SITE_URL}${urlPath}</loc>
  <lastmod>${lastModification}</lastmod>
</url>`
}

const buildSitemap = (
  routes: ReadonlyArray<AppRoute>,
  lastModification: string,
): string => {
  const entries = pipe(
    routes,
    Array.map(routeToSitemapEntry(lastModification)),
    Array.join('\n'),
  )

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`
}

// RSS

// NOTE: index.html advertises the feed with this same title on its
// `rel="alternate"` link, which is static HTML and cannot import it.
const RSS_FEED_TITLE = 'Foldkit Blog'

const escapeXml = (text: string): string =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

const toRfc822Date = (date: string): string =>
  Option.match(DateTime.make(date), {
    onNone: () => date,
    onSome: dateTime => DateTime.toDateUtc(dateTime).toUTCString(),
  })

/**
 * Extracts a prerendered blog post page's `article` element, the cover, the
 * header, and the rendered prose, leaving out the surrounding site chrome.
 */
export const extractPostArticleHtml = (
  pageHtml: string,
): Option.Option<string> =>
  pipe(
    String_.indexOf('<article')(pageHtml),
    Option.flatMap(startIndex =>
      Option.map(String_.indexOf('</article>')(pageHtml), endIndex =>
        pageHtml.slice(startIndex, endIndex + '</article>'.length),
      ),
    ),
  )

/**
 * Prepares an extracted article for the feed: root-relative links and image
 * sources become absolute, since feed readers resolve them against nothing,
 * and the back-to-blog link is dropped, since it only makes sense on the site.
 */
export const toFeedArticleHtml = (articleHtml: string): string =>
  articleHtml
    .replace(/<a[^>]*>←[^<]*<\/a>/, '')
    .replace(/(href|src)="\//g, `$1="${SITE_URL}/`)

const escapeCdataContent = (html: string): string =>
  html.replaceAll(']]>', ']]]]><![CDATA[>')

const maybeFeedArticleEntry = (
  result: PrerenderResult,
): Option.Option<readonly [string, string]> =>
  M.value(result.route).pipe(
    M.tag('BlogPost', ({ postSlug }) =>
      Option.map(
        extractPostArticleHtml(result.html),
        articleHtml => [postSlug, toFeedArticleHtml(articleHtml)] as const,
      ),
    ),
    M.orElse(() => Option.none()),
  )

const blogPostRssItem = (
  entry: BlogPostEntry,
  maybeArticleHtml: Option.Option<string>,
): string => {
  const postUrl = `${SITE_URL}${blogPostRouter({ postSlug: entry.slug })}`
  const enclosure = Option.match(entry.maybeCoverAsset, {
    onNone: () => '',
    onSome: cover =>
      `\n  <enclosure url="${escapeXml(`${SITE_URL}${cover.src}`)}" length="${cover.byteLength}" type="${cover.mimeType}" />`,
  })
  const contentEncoded = Option.match(maybeArticleHtml, {
    onNone: () => '',
    onSome: articleHtml =>
      `\n  <content:encoded><![CDATA[${escapeCdataContent(articleHtml)}]]></content:encoded>`,
  })
  return `<item>
  <title>${escapeXml(entry.frontmatter.title)}</title>
  <link>${escapeXml(postUrl)}</link>
  <guid>${escapeXml(postUrl)}</guid>
  <description>${escapeXml(entry.frontmatter.description)}</description>
  <pubDate>${toRfc822Date(entry.frontmatter.date)}</pubDate>${enclosure}${contentEncoded}
</item>`
}

// NOTE: posts arrive newest first, so the newest post's date is the feed's last
// build date. Deriving it from the content rather than the clock keeps two
// builds of the same commit byte-identical.
const rssChannelHeader = (posts: ReadonlyArray<BlogPostEntry>): string => {
  const channel = `<title>${RSS_FEED_TITLE}</title>
<link>${SITE_URL}${blogRouter()}</link>
<atom:link href="${SITE_URL}${BLOG_RSS_PATH}" rel="self" type="application/rss+xml" />
<description>${escapeXml(BLOG_DESCRIPTION)}</description>`

  return Option.match(Array.head(posts), {
    onNone: () => channel,
    onSome: newest =>
      `${channel}\n<lastBuildDate>${toRfc822Date(newest.frontmatter.date)}</lastBuildDate>`,
  })
}

export const buildBlogRssFeed = (
  posts: ReadonlyArray<BlogPostEntry>,
  articleHtmlBySlug: ReadonlyMap<string, string>,
): string => {
  const items = pipe(
    posts,
    Array.map(entry =>
      blogPostRssItem(
        entry,
        Option.fromNullishOr(articleHtmlBySlug.get(entry.slug)),
      ),
    ),
    Array.join('\n'),
  )

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
${rssChannelHeader(posts)}
${items}
</channel>
</rss>`
}

// PROGRAM

const resultToIndexEntry =
  (resolveApiModuleName: ApiModuleNameResolver) =>
  (result: PrerenderResult): LlmsIndexEntry => ({
    urlPath: result.urlPath,
    metadata: routeToMetadata(result.route, resolveApiModuleName),
  })

const resultToFullEntry =
  (resolveApiModuleName: ApiModuleNameResolver) =>
  (result: PrerenderResult, orderIndex: number): LlmsFullEntry => ({
    urlPath: result.urlPath,
    metadata: routeToMetadata(result.route, resolveApiModuleName),
    markdown: result.markdown,
    orderIndex,
  })

// NOTE: page rendering runs through the server bundle with no browser, but
// blog cover share cards still rasterize through a real page, so OG image
// generation holds the one remaining Playwright browser.
const playwrightBrowserResource = Effect.acquireRelease(
  Effect.tryPromise(() => chromium.launch({ headless: true })),
  browser => Effect.promise(() => browser.close()),
)

const program = Effect.scoped(
  Effect.gen(function* () {
    yield* Console.log('Starting prerender...')

    const serverEntry = yield* loadServerEntry
    const browser = yield* playwrightBrowserResource

    const apiModules = yield* readApiModules
    const apiModuleSlugs = Array.map(apiModules, ({ name }) =>
      moduleNameToSlug(name),
    )
    const resolveApiModuleName = buildApiModuleNameResolver(apiModules)
    const routes = enumerateRoutes(apiModuleSlugs)

    yield* generateOgImages(
      routes,
      routeToUrlPath,
      DIST_DIR,
      resolveApiModuleName,
      browser,
    )

    const fs = yield* FileSystem.FileSystem
    const baseHtml = yield* fs.readFileString(resolve(DIST_DIR, 'index.html'))

    yield* prerenderPlaygroundShell(serverEntry, baseHtml)

    const results = yield* Effect.forEach(
      routes,
      prerenderRoute(serverEntry, baseHtml, resolveApiModuleName),
      { concurrency: 4 },
    )

    const successfulResults = Array.getSomes(results)
    const failedResults = Array.filter(results, Option.isNone)
    if (Array.isArrayNonEmpty(failedResults)) {
      return yield* Effect.die(
        new Error(
          `Failed to prerender ${failedResults.length} routes. See the errors above.`,
        ),
      )
    }
    const markdownResults = Array.filter(
      successfulResults,
      result => result.markdown.length > 0,
    )

    const lastModification = formatDateIso(yield* DateTime.now)
    yield* fs.writeFileString(
      resolve(DIST_DIR, 'sitemap.xml'),
      buildSitemap(routes, lastModification),
    )

    const feedArticleHtmlBySlug = new Map(
      pipe(successfulResults, Array.map(maybeFeedArticleEntry), Array.getSomes),
    )

    const rssFilePath = join(DIST_DIR, BLOG_RSS_PATH)
    yield* fs.makeDirectory(dirname(rssFilePath), { recursive: true })
    yield* fs.writeFileString(
      rssFilePath,
      buildBlogRssFeed(blogPosts, feedArticleHtmlBySlug),
    )
    yield* Console.log(`  ✓ ${BLOG_RSS_PATH}`)

    const indexEntries = Array.map(
      markdownResults,
      resultToIndexEntry(resolveApiModuleName),
    )
    const fullEntries = Array.map(
      markdownResults,
      resultToFullEntry(resolveApiModuleName),
    )

    yield* fs.writeFileString(
      resolve(DIST_DIR, 'llms.txt'),
      buildLlmsIndex(indexEntries),
    )
    yield* fs.writeFileString(
      resolve(DIST_DIR, 'llms-full.txt'),
      buildLlmsFull(fullEntries, lastModification),
    )

    yield* Console.log(
      `Prerendered ${routes.length} routes; emitted ${markdownResults.length} markdown pages.`,
    )
  }),
)

if (import.meta.url === `file://${process.argv[1]}`) {
  NodeRuntime.runMain(program.pipe(Effect.provide(NodeServices.layer)))
}
