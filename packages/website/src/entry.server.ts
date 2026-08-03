import {
  DateTime,
  Effect,
  Option,
  Record as Record_,
  Schema as S,
} from 'effect'
import { Calendar } from 'foldkit'
import * as Server from 'foldkit/experimental/server'
import { evo } from 'foldkit/struct'
import { type Url } from 'foldkit/url'

import { Flags, Model, init, view } from './main'
import * as Page from './page'
import { ParsedApiReference } from './page/apiReference/domain'
import { SucceededLoadApiData } from './page/apiReference/message'
import { type ApiData } from './page/apiReference/model'
import { SucceededLoadExampleSources } from './page/example/exampleDetail'
import { exampleSlugs } from './page/example/meta'
import { type ExampleSources, loadSourcesForSlug } from './page/example/sources'

type SourcesBySlug = Readonly<Record<string, ExampleSources>>

// NOTE: the same data the LoadApiData and LoadExampleSources Commands import
// lazily in the browser, loaded eagerly here so the prerendered Model carries
// full page content instead of the Commands' loading states.
const loadApiData: Effect.Effect<ApiData> = Effect.map(
  Effect.promise(() =>
    Promise.all([
      import('virtual:parsed-api'),
      import('virtual:api-highlights'),
    ]),
  ),
  ([parsedApiModule, highlightsModule]) => ({
    parsedApi: S.decodeUnknownSync(ParsedApiReference)(parsedApiModule.default),
    highlights: highlightsModule.default,
  }),
)

const loadAllExampleSources: Effect.Effect<SourcesBySlug> = Effect.map(
  Effect.promise(() =>
    Promise.all(
      exampleSlugs.map(
        async slug => [slug, await loadSourcesForSlug(slug)] as const,
      ),
    ),
  ),
  Record_.fromEntries,
)

const seedApiReference = (
  model: typeof Model.Type,
  apiData: ApiData,
): typeof Model.Type => {
  const [nextApiReference] = Page.ApiReference.update(
    model.apiReference,
    SucceededLoadApiData({ apiData }),
  )
  return evo(model, { apiReference: () => nextApiReference })
}

const seedExampleSources = (
  model: typeof Model.Type,
  sourcesBySlug: SourcesBySlug,
): typeof Model.Type => {
  const route = model.route
  if (route._tag !== 'ExampleDetail') {
    return model
  }
  return Option.match(Record_.get(sourcesBySlug, route.exampleSlug), {
    onNone: () => model,
    onSome: sources => {
      const [nextExampleDetail] = Page.Example.ExampleDetail.update(
        model.exampleDetail,
        SucceededLoadExampleSources({ sources }),
      )
      return evo(model, { exampleDetail: () => nextExampleDetail })
    },
  })
}

const makeServerInit =
  (apiData: ApiData, sourcesBySlug: SourcesBySlug) =>
  (
    flags: typeof Flags.Type,
    url: Url,
  ): readonly [typeof Model.Type, ReadonlyArray<never>] => {
    const [initialModel] = init(flags, url)
    const seededModel = seedExampleSources(
      seedApiReference(initialModel, apiData),
      sourcesBySlug,
    )
    return [seededModel, []]
  }

/** Builds the page renderer for the prerender script. Rendering happens
 *  inside this module's graph so the whole render shares one foldkit
 *  instance; the Vite SSR build bundles linked workspace packages, so a host
 *  importing `foldkit/experimental/server` itself would push the render frame in a second
 *  copy. `routing` is present so `renderToString` passes each route's URL to
 *  `init`; no runtime ever starts, so no handlers are needed. The wrapped
 *  `init` seeds API reference data and example sources through the same
 *  Messages the browser Commands would dispatch, applied via the pure page
 *  updates. */
export const makeRenderer: Effect.Effect<
  Readonly<{
    renderPage: (
      options: Readonly<{ url: string; flags: typeof Flags.Type }>,
    ) => Effect.Effect<Server.RenderedApplication, Server.ServerRenderError>
  }>
> = Effect.map(
  Effect.all([loadApiData, loadAllExampleSources]),
  ([apiData, sourcesBySlug]) => {
    const serverConfig = {
      Flags,
      routing: {},
      init: makeServerInit(apiData, sourcesBySlug),
      view,
    }
    return {
      renderPage: ({ url, flags }) =>
        Server.renderToString(serverConfig, {
          url,
          flags,
          isHydratable: false,
        }),
    }
  },
)

/** Build-time flags for static generation. One rendered page serves every
 *  visitor, so browser-environment facts take their neutral defaults and the
 *  client re-resolves the real values with a fresh boot. */
export const prerenderFlags: Effect.Effect<typeof Flags.Type> = Effect.gen(
  function* () {
    const currentYear = yield* DateTime.now.pipe(
      Effect.map(DateTime.getPartUtc('year')),
    )
    const today = yield* Calendar.today.local

    return Flags.make({
      themePreference: Option.none(),
      maybeSidebarState: Option.none(),
      systemTheme: 'Light',
      isNarrowViewport: false,
      isChromium: false,
      currentYear,
      today,
    })
  },
)
