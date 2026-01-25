import { Html } from 'foldkit/html'

import { Class, InnerHTML, div, li, ul } from '../html'
import { Link } from '../link'
import type { Model, TableOfContentsEntry } from '../main'
import { heading, inlineCode, link, para, section } from '../prose'
import * as Snippets from '../snippet'
import { highlightedCodeBlock } from '../view/codeBlock'

type Header = { id: string; text: string }

const biparserHeader: Header = {
  id: 'biparser',
  text: 'The Biparser Approach',
}

const definingRoutesHeader: Header = {
  id: 'defining-routes',
  text: 'Defining Routes',
}

const buildingRoutersHeader: Header = {
  id: 'building-routers',
  text: 'Building Routers',
}

const parsingUrlsHeader: Header = {
  id: 'parsing-urls',
  text: 'Parsing URLs',
}

const buildingUrlsHeader: Header = {
  id: 'building-urls',
  text: 'Building URLs',
}

const queryParametersHeader: Header = {
  id: 'query-parameters',
  text: 'Query Parameters',
}

const keyingRouteViewsHeader: Header = {
  id: 'keying-route-views',
  text: 'Keying Route Views',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  { level: 'h2', ...biparserHeader },
  { level: 'h2', ...definingRoutesHeader },
  { level: 'h2', ...buildingRoutersHeader },
  { level: 'h2', ...parsingUrlsHeader },
  { level: 'h2', ...buildingUrlsHeader },
  { level: 'h2', ...queryParametersHeader },
  { level: 'h2', ...keyingRouteViewsHeader },
]

export const view = (model: Model): Html =>
  div(
    [],
    [
      heading(1, 'routing', 'Routing'),
      para(
        'Foldkit uses a bidirectional routing system where you define routes once and use them for both parsing URLs and building URLs. No more keeping route matchers and URL builders in sync.',
      ),
      section(biparserHeader.id, biparserHeader.text, [
        para(
          'Most routers make you define routes twice: once for matching URLs, and again for generating them. This leads to duplication and bugs when they get out of sync.',
        ),
        para(
          "Foldkit's routing is based on biparsers — parsers that work in both directions. A single route definition handles:",
        ),
        ul(
          [Class('list-disc mb-6 space-y-2 ml-4')],
          [
            li(
              [],
              [
                inlineCode('/people/42'),
                ' → ',
                inlineCode('PersonRoute { personId: 42 }'),
                ' (parsing)',
              ],
            ),
            li(
              [],
              [
                inlineCode('PersonRoute { personId: 42 }'),
                ' → ',
                inlineCode('/people/42'),
                ' (building)',
              ],
            ),
          ],
        ),
        para(
          'This symmetry means if you can parse a URL into data, you can always build that data back into the same URL.',
        ),
      ]),
      section(definingRoutesHeader.id, definingRoutesHeader.text, [
        para(
          'Routes are defined as tagged unions using ',
          link(Link.effectSchema, 'Effect Schema'),
          '. Each route variant carries the data extracted from the URL.',
        ),
        highlightedCodeBlock(
          div(
            [
              Class('text-sm'),
              InnerHTML(Snippets.routingDefineRoutesHighlighted),
            ],
            [],
          ),
          Snippets.routingDefineRoutesRaw,
          'Copy route definitions to clipboard',
          model,
          'mb-8',
        ),
        ul(
          [Class('list-none mb-6 space-y-2')],
          [
            li([], [inlineCode('HomeRoute'), ' — no parameters']),
            li(
              [],
              [
                inlineCode('PersonRoute'),
                ' — holds a ',
                inlineCode('personId: number'),
              ],
            ),
            li(
              [],
              [
                inlineCode('PeopleRoute'),
                ' — holds an optional ',
                inlineCode('searchText: Option<string>'),
              ],
            ),
            li(
              [],
              [
                inlineCode('NotFoundRoute'),
                ' — holds the unmatched ',
                inlineCode('path: string'),
              ],
            ),
          ],
        ),
      ]),
      section(buildingRoutersHeader.id, buildingRoutersHeader.text, [
        para(
          'Routers are built by composing small primitives. Each primitive is a biparser that handles one part of the URL.',
        ),
        highlightedCodeBlock(
          div(
            [
              Class('text-sm'),
              InnerHTML(Snippets.routingBuildRoutersHighlighted),
            ],
            [],
          ),
          Snippets.routingBuildRoutersRaw,
          'Copy router definitions to clipboard',
          model,
          'mb-8',
        ),
        para('The primitives:'),
        ul(
          [Class('list-nonw mb-6 space-y-2')],
          [
            li(
              [],
              [
                inlineCode("literal('people')"),
                ' — matches the exact segment ',
                inlineCode('people'),
              ],
            ),
            li(
              [],
              [
                inlineCode("int('personId')"),
                ' — captures an integer parameter',
              ],
            ),
            li(
              [],
              [
                inlineCode("string('name')"),
                ' — captures a string parameter',
              ],
            ),
            li(
              [],
              [
                inlineCode('slash(...)'),
                ' — chains path segments together',
              ],
            ),
            li(
              [],
              [
                inlineCode('Route.query(Schema)'),
                ' — adds query parameter parsing',
              ],
            ),
            li(
              [],
              [
                inlineCode('Route.mapTo(RouteType)'),
                ' — converts parsed data into a typed route',
              ],
            ),
          ],
        ),
      ]),
      section(parsingUrlsHeader.id, parsingUrlsHeader.text, [
        para(
          'Combine routers with ',
          inlineCode('Route.oneOf'),
          ' and create a parser with a fallback for unmatched URLs.',
        ),
        highlightedCodeBlock(
          div(
            [
              Class('text-sm'),
              InnerHTML(Snippets.routingParsingHighlighted),
            ],
            [],
          ),
          Snippets.routingParsingRaw,
          'Copy URL parsing example to clipboard',
          model,
          'mb-8',
        ),
        para(
          'Order matters in ',
          inlineCode('oneOf'),
          '. Put more specific routes first — ',
          inlineCode('/people/:id'),
          ' should come before ',
          inlineCode('/people'),
          ' so the parameter route gets a chance to match.',
        ),
      ]),
      section(buildingUrlsHeader.id, buildingUrlsHeader.text, [
        para(
          "Here's where the biparser pays off. The same router that parses URLs can build them:",
        ),
        highlightedCodeBlock(
          div(
            [
              Class('text-sm'),
              InnerHTML(Snippets.routingBuildingHighlighted),
            ],
            [],
          ),
          Snippets.routingBuildingRaw,
          'Copy URL building example to clipboard',
          model,
          'mb-8',
        ),
        para(
          'TypeScript ensures you provide the correct data. If ',
          inlineCode('personRouter'),
          ' expects ',
          inlineCode('{ personId: number }'),
          ", you can't accidentally pass a string or forget the parameter.",
        ),
      ]),
      section(queryParametersHeader.id, queryParametersHeader.text, [
        para(
          'Query parameters use ',
          link(Link.effectSchema, 'Effect Schema'),
          ' for validation. This gives you type-safe parsing, optional parameters, and automatic encoding/decoding.',
        ),
        highlightedCodeBlock(
          div(
            [
              Class('text-sm'),
              InnerHTML(Snippets.routingQueryParamsHighlighted),
            ],
            [],
          ),
          Snippets.routingQueryParamsRaw,
          'Copy query parameters example to clipboard',
          model,
          'mb-8',
        ),
        para(
          inlineCode('S.OptionFromUndefinedOr'),
          ' makes parameters optional — missing params become ',
          inlineCode('Option.none()'),
          '. ',
          inlineCode('S.NumberFromString'),
          ' automatically parses string query values into numbers.',
        ),
        para(
          'For a complete routing example, see the ',
          link(Link.exampleRouting, 'Routing example'),
          '.',
        ),
      ]),
      section(
        keyingRouteViewsHeader.id,
        keyingRouteViewsHeader.text,
        [
          para(
            'When rendering different routes in the same DOM position, you should key the content by the route tag. This tells ',
            link(Link.snabbdom, 'Snabbdom'),
            ' (which Foldkit uses for ',
            link(Link.foldkitVdom, 'virtual DOM diffing'),
            ') that different routes are distinct trees that should be fully replaced rather than patched.',
          ),
          highlightedCodeBlock(
            div(
              [
                Class('text-sm'),
                InnerHTML(Snippets.routingKeyedHighlighted),
              ],
              [],
            ),
            Snippets.routingKeyedRaw,
            'Copy keyed route example to clipboard',
            model,
            'mb-8',
          ),
          para(
            'Without the key, Snabbdom tries to diff the old and new route views as if they were the same tree. This can cause unexpected behavior when routes have different structures.',
          ),
          para(
            'In React, this happens automatically — different component types in the same position cause a full remount. In Foldkit, you achieve the same behavior by explicitly keying with ',
            inlineCode('model.route._tag'),
            '.',
          ),
        ],
      ),
    ],
  )
