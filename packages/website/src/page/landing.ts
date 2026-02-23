import { Html } from 'foldkit/html'
import { foldkitVersion } from 'virtual:landing-data'

import {
  Alt,
  Class,
  Href,
  Id,
  Src,
  a,
  div,
  h1,
  h2,
  h3,
  img,
  p,
  section,
  span,
} from '../html'
import { Icon } from '../icon'
import { Link } from '../link'
import { type Model } from '../main'
import { codeBlock } from '../view/codeBlock'
import { exampleAppCount } from './examples'

// CONSTANTS

export const HERO_SECTION_ID = 'hero'

// VIEW

export const view = (model: Model): Html =>
  div(
    [],
    [
      heroSection(model),
      promiseSection(),
      demoPlaceholderSection(),
      poweredByStrip(),
      includedSection(),
      whyFoldkitSection(),
      audienceSection(),
      comparisonStripSection(),
      trustSection(),
      finalCtaSection(),
    ],
  )

// HERO

const INSTALL_COMMAND = 'npx create-foldkit-app@latest --wizard'

const heroSection = (model: Model): Html =>
  section(
    [Id(HERO_SECTION_ID), Class('landing-section hero-dot-grid')],
    [
      div(
        [Class('landing-section-narrow text-center')],
        [
          div(
            [Class('flex justify-center mb-8')],
            [
              img([
                Src('/logo.svg'),
                Alt('Foldkit'),
                Class('h-10 md:h-12 dark:invert'),
              ]),
            ],
          ),
          h1(
            [
              Class(
                'text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight text-balance',
              ),
            ],
            [
              span([Class('hero-gradient-text')], ['Beautifully']),
              ' boring frontend applications.',
            ],
          ),
          p(
            [
              Class(
                'mt-6 text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed text-balance',
              ),
            ],
            [
              'No surprises. No magic. Just an architecture that does exactly what you describe.',
            ],
          ),
          div(
            [Class('mt-8')],
            [
              codeBlock(
                INSTALL_COMMAND,
                'Copy install command',
                model,
                'max-w-fit mx-auto [&_pre]:text-xs [&_pre]:md:text-sm',
              ),
            ],
          ),
          div(
            [
              Class(
                'mt-8 flex flex-col sm:flex-row items-center justify-center gap-4',
              ),
            ],
            [
              a(
                [Href(Link.gettingStarted), Class('cta-primary')],
                ['Dive In', Icon.arrowRight('w-5 h-5')],
              ),
              a(
                [Href(Link.github), Class('cta-secondary')],
                [Icon.github('w-5 h-5'), 'View on GitHub'],
              ),
            ],
          ),
        ],
      ),
    ],
  )

// POWERED BY

const poweredByStrip = (): Html =>
  section(
    [
      Class(
        'landing-section py-10 md:py-14 text-center bg-gray-50 dark:bg-gray-850',
      ),
    ],
    [
      div(
        [Class('landing-section-narrow')],
        [
          p(
            [
              Class(
                'text-xl md:text-2xl font-bold text-gray-900 dark:text-white text-balance',
              ),
            ],
            [
              'Powered by ',
              a(
                [
                  Href(Link.effect),
                  Class(
                    'text-blue-500 dark:text-blue-400 hover:underline',
                  ),
                ],
                ['Effect'],
              ),
              '. Inside and out.',
            ],
          ),
          p(
            [
              Class(
                'mt-3 text-lg text-gray-600 dark:text-gray-400 text-balance',
              ),
            ],
            [
              'Every Foldkit application is an Effect. All state is a single Schema. Side effects are modeled as Effects that never fail.',
            ],
          ),
          p(
            [Class('mt-3 text-gray-500 dark:text-gray-400')],
            ['(Yeah, we like Effect.)'],
          ),
        ],
      ),
    ],
  )

// THE PROMISE

const pillarCard = (
  icon: Html,
  title: string,
  description: string,
): Html =>
  div(
    [Class('landing-card p-6 dark:bg-gray-900')],
    [
      div([Class('mb-3 text-blue-600 dark:text-blue-400')], [icon]),
      h3(
        [
          Class(
            'text-lg font-semibold text-gray-900 dark:text-white mb-2',
          ),
        ],
        [title],
      ),
      p(
        [Class('text-gray-600 dark:text-gray-400 leading-relaxed')],
        [description],
      ),
    ],
  )

const promiseSection = (): Html =>
  section(
    [Class('landing-section bg-gray-50 dark:bg-gray-850')],
    [
      div(
        [Class('landing-section-narrow')],
        [
          h2(
            [
              Class(
                'text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3 text-center text-balance',
              ),
            ],
            ['Declare behavior. Ship. Repeat.'],
          ),
          p(
            [
              Class(
                'text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-10 max-w-3xl mx-auto text-center text-balance',
              ),
            ],
            [
              'Most frameworks let you do anything. Foldkit lets you do one thing really well: describe your application as a value and let the runtime run it.',
            ],
          ),
          div(
            [Class('grid gap-6 md:grid-cols-3')],
            [
              pillarCard(
                Icon.lockClosed('w-6 h-6'),
                'Predictable state',
                'One immutable model holds your entire application state. Every change flows through a single update function. No hidden mutations, no stale closures, no surprises.',
              ),
              pillarCard(
                Icon.bolt('w-6 h-6'),
                'Explicit effects',
                'Side effects are values you return, not callbacks you fire. Commands declare what should happen. The runtime handles when and how.',
              ),
              pillarCard(
                Icon.arrowsPointingOut('w-6 h-6'),
                'Scales with grace',
                'The architecture scales without complexity creep. A 50-file app follows the same patterns as a 5-file app. New team members read the code and understand it.',
              ),
            ],
          ),
        ],
      ),
    ],
  )

// DEMO PLACEHOLDER

const demoPlaceholderSection = (): Html =>
  section(
    [Class('landing-section')],
    [
      div(
        [Class('landing-section-narrow')],
        [
          div(
            [Class('demo-placeholder h-64 md:h-80')],
            [
              div(
                [Class('text-center')],
                [
                  p(
                    [
                      Class(
                        'text-gray-400 dark:text-gray-500 text-sm font-medium',
                      ),
                    ],
                    ['Interactive architecture demo coming soon'],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  )

// WHAT'S INCLUDED

const includedFeature = (
  icon: Html,
  title: string,
  description: ReadonlyArray<string | Html>,
): Html =>
  div(
    [Class('landing-card p-6 dark:bg-gray-850')],
    [
      div([Class('mb-3 text-blue-600 dark:text-blue-400')], [icon]),
      h3(
        [
          Class(
            'text-base font-semibold text-gray-900 dark:text-white mb-2',
          ),
        ],
        [title],
      ),
      p(
        [Class('text-gray-600 dark:text-gray-400 leading-relaxed')],
        description,
      ),
    ],
  )

const includedSection = (): Html =>
  section(
    [Class('landing-section')],
    [
      div(
        [Class('landing-section-narrow')],
        [
          h2(
            [
              Class(
                'text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3 text-balance',
              ),
            ],
            ['One framework. Batteries included.'],
          ),
          p(
            [
              Class(
                'text-gray-600 dark:text-gray-400 leading-relaxed mb-10 max-w-3xl text-balance',
              ),
            ],
            [
              "No more stitching together a routing library, a state manager, a UI kit, and a form validator. Foldkit ships everything you need as one coherent system. And nothing you don't.",
            ],
          ),
          div(
            [Class('grid gap-6 sm:grid-cols-2 lg:grid-cols-3')],
            [
              includedFeature(Icon.route('w-6 h-6'), 'Routing', [
                'Type-safe bidirectional routing. URLs parse into typed routes and routes build back into URLs. No string matching, no runtime surprises.',
              ]),
              includedFeature(
                Icon.puzzle('w-6 h-6'),
                'UI Components',
                [
                  'Accessible headless primitives — dialog, menu, tabs, disclosure — built for the Elm Architecture. No React dependency. ',
                  span(
                    [
                      Class(
                        'inline-block ml-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400',
                      ),
                    ],
                    ['In development'],
                  ),
                ],
              ),
              includedFeature(
                Icon.squareStack('w-6 h-6'),
                'Virtual DOM',
                [
                  'Built on ',
                  a(
                    [
                      Href(Link.snabbdom),
                      Class(
                        'text-blue-500 dark:text-blue-400 hover:underline',
                      ),
                    ],
                    ['Snabbdom'],
                  ),
                  '. Fast, keyed diffing with declarative views that are plain functions of your model.',
                ],
              ),
              includedFeature(
                Icon.signal('w-6 h-6'),
                'Command Streams',
                [
                  'Declarative subscriptions that react to model changes. Timers, DOM observers, and external events are managed automatically. Set up when needed, torn down when not.',
                ],
              ),
              includedFeature(
                Icon.shieldCheck('w-6 h-6'),
                'Field Validation',
                [
                  'Schema-driven validation with per-field error states. Validation rules live in your model, not scattered across event handlers.',
                ],
              ),
              includedFeature(
                Icon.cog('w-6 h-6'),
                'Side Effect Management',
                [
                  'Commands are values you return, not imperative calls. Every async operation is explicit, testable, and composable via Effect.',
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  )

// WHY FOLDKIT

const benefitBlock = (
  icon: Html,
  title: string,
  description: string,
): Html =>
  div(
    [Class('py-6 flex gap-4')],
    [
      div(
        [Class('shrink-0 mt-0.5 text-blue-600 dark:text-blue-400')],
        [icon],
      ),
      div(
        [],
        [
          h3(
            [
              Class(
                'text-lg font-semibold text-gray-900 dark:text-white mb-2',
              ),
            ],
            [title],
          ),
          p(
            [
              Class(
                'text-gray-600 dark:text-gray-400 leading-relaxed',
              ),
            ],
            [description],
          ),
        ],
      ),
    ],
  )

const whyFoldkitSection = (): Html =>
  section(
    [Class('landing-section bg-gray-50 dark:bg-gray-850')],
    [
      div(
        [Class('landing-section-narrow')],
        [
          h2(
            [
              Class(
                'text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-8 text-balance',
              ),
            ],
            ['Why Foldkit'],
          ),
          p(
            [
              Class(
                'text-gray-600 dark:text-gray-400 leading-relaxed mb-8 max-w-3xl',
              ),
            ],
            [
              'Foldkit implements ',
              a(
                [
                  Href(Link.theElmArchitecture),
                  Class(
                    'text-blue-500 dark:text-blue-400 hover:underline',
                  ),
                ],
                ['The Elm Architecture'],
              ),
              ' in TypeScript, powered by ',
              a(
                [
                  Href(Link.effect),
                  Class(
                    'text-blue-500 dark:text-blue-400 hover:underline',
                  ),
                ],
                ['Effect'],
              ),
              '. These foundations give you guarantees that other frameworks cannot.',
            ],
          ),
          div(
            [Class('grid gap-2 md:grid-cols-2 md:gap-x-12')],
            [
              benefitBlock(
                Icon.circleStack('w-6 h-6'),
                'Single source of truth',
                'Your entire application state lives in one immutable model. No component trees to reconcile, no context providers to thread, no store subscriptions to manage.',
              ),
              benefitBlock(
                Icon.chatBubble('w-6 h-6'),
                'Messages describe what happened',
                'Every state update begins with a fact about what happened. ClickedSubmitButton, SucceededFetchWeather, TickedTimer. The update function decides what to do. Testing is trivial: send a message, check the model.',
              ),
              benefitBlock(
                Icon.codeBracket('w-6 h-6'),
                'Commands as values',
                'Side effects are data you return from update, not imperative calls you fire. This makes async flows explicit, testable, and impossible to accidentally forget.',
              ),
              benefitBlock(
                Icon.checkBadge('w-6 h-6'),
                'Type-safe from edge to edge',
                'Effect Schema validates at system boundaries. Discriminated unions make impossible states unrepresentable. The compiler catches the bugs your tests would miss.',
              ),
            ],
          ),
        ],
      ),
    ],
  )

// AUDIENCE

const audienceSection = (): Html =>
  section(
    [Class('landing-section')],
    [
      div(
        [Class('landing-section-narrow')],
        [
          div(
            [Class('grid gap-8 md:grid-cols-2')],
            [
              div(
                [],
                [
                  h2(
                    [
                      Class(
                        'text-2xl font-bold text-gray-900 dark:text-white mb-6 text-balance',
                      ),
                    ],
                    ["Who it's for"],
                  ),
                  audienceForItem(
                    'Developers who value correctness',
                    'You want your architecture to prevent bugs, not just catch them.',
                  ),
                  audienceForItem(
                    'Teams that need to stay aligned',
                    'One pattern for state, effects, and views means less disagreement and faster onboarding.',
                  ),
                  audienceForItem(
                    'Projects with complex state',
                    'Auth flows, real-time data, multi-step forms — the architecture handles complexity without losing clarity.',
                  ),
                ],
              ),
              div(
                [],
                [
                  h2(
                    [
                      Class(
                        'text-2xl font-bold text-gray-900 dark:text-white mb-6 text-balance',
                      ),
                    ],
                    ["Who it's not for"],
                  ),
                  audienceNotItem(
                    'Large existing React codebases',
                    "Foldkit isn't an incremental adoption — it's a different architecture. Migration means a rewrite.",
                  ),
                  audienceNotItem(
                    'Teams unwilling to learn Effect',
                    "Foldkit leans on pipe, discriminated unions, and Effect throughout. The learning curve is real and there's no escape hatch.",
                  ),
                  audienceNotItem(
                    'Projects that need the React ecosystem',
                    "No React component libraries, no Next.js, no existing middleware. You're building on different foundations.",
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  )

const audienceForItem = (title: string, description: string): Html =>
  div(
    [Class('mb-5 flex gap-3')],
    [
      div(
        [Class('shrink-0 mt-0.5 text-green-600 dark:text-green-400')],
        [Icon.check('w-5 h-5')],
      ),
      div(
        [],
        [
          h3(
            [
              Class(
                'text-base font-semibold text-gray-900 dark:text-white mb-1',
              ),
            ],
            [title],
          ),
          p(
            [
              Class(
                'text-gray-600 dark:text-gray-400 leading-relaxed',
              ),
            ],
            [description],
          ),
        ],
      ),
    ],
  )

const audienceNotItem = (title: string, description: string): Html =>
  div(
    [Class('mb-5 flex gap-3')],
    [
      div(
        [Class('shrink-0 mt-0.5 text-gray-400 dark:text-gray-500')],
        [Icon.close('w-5 h-5')],
      ),
      div(
        [],
        [
          h3(
            [
              Class(
                'text-base font-semibold text-gray-900 dark:text-white mb-1',
              ),
            ],
            [title],
          ),
          p(
            [
              Class(
                'text-gray-600 dark:text-gray-400 leading-relaxed',
              ),
            ],
            [description],
          ),
        ],
      ),
    ],
  )

// COMPARISON STRIP

const comparisonStripSection = (): Html =>
  section(
    [
      Class(
        'landing-section bg-gray-50 dark:bg-gray-850 text-center',
      ),
    ],
    [
      div(
        [Class('landing-section-narrow')],
        [
          h2(
            [
              Class(
                'text-2xl font-bold text-gray-900 dark:text-white mb-4 text-balance',
              ),
            ],
            ['How does Foldkit compare to React?'],
          ),
          p(
            [
              Class(
                'text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto text-balance',
              ),
            ],
            [
              "We've written a detailed comparison covering state management, side effects, type safety, and more.",
            ],
          ),
          a(
            [
              Href('/why-foldkit#foldkit-vs-react'),
              Class('cta-secondary'),
            ],
            ['See the full comparison', Icon.arrowRight('w-5 h-5')],
          ),
        ],
      ),
    ],
  )

// TRUST & MATURITY

const trustSection = (): Html =>
  section(
    [Class('landing-section py-10 md:py-14')],
    [
      div(
        [Class('landing-section-narrow')],
        [
          div(
            [Class('grid gap-6 sm:grid-cols-2 lg:grid-cols-4')],
            [
              trustItem('Version', `v${foldkitVersion}`),
              trustItemWithLink(
                'Example apps',
                String(exampleAppCount),
                Link.exampleApps,
              ),
              trustItemWithLink(
                'Production app',
                'Typing Terminal',
                Link.typingTerminal,
              ),
              trustItemWithLink(
                'Changelog',
                'View releases',
                Link.changelog,
              ),
            ],
          ),
        ],
      ),
    ],
  )

const trustItem = (label: string, value: string): Html =>
  div(
    [Class('landing-card p-5 text-center dark:bg-gray-850')],
    [
      p(
        [
          Class(
            'text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1',
          ),
        ],
        [label],
      ),
      p(
        [Class('text-xl font-bold text-gray-900 dark:text-white')],
        [value],
      ),
    ],
  )

const trustItemWithLink = (
  label: string,
  linkText: string,
  href: string,
): Html =>
  div(
    [Class('landing-card p-5 text-center dark:bg-gray-850')],
    [
      p(
        [
          Class(
            'text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1',
          ),
        ],
        [label],
      ),
      a(
        [
          Href(href),
          Class(
            'text-blue-500 dark:text-blue-400 hover:underline text-lg font-semibold',
          ),
        ],
        [
          linkText,
          span(
            [Class('inline-block ml-1')],
            [Icon.arrowRight('w-4 h-4 inline')],
          ),
        ],
      ),
    ],
  )

// FINAL CTA

const finalCtaSection = (): Html =>
  section(
    [
      Class(
        'landing-section bg-gray-50 dark:bg-gray-850 text-center',
      ),
    ],
    [
      div(
        [Class('landing-section-narrow')],
        [
          h2(
            [
              Class(
                'text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4 text-balance',
              ),
            ],
            ['Ready to build with confidence?'],
          ),
          p(
            [
              Class(
                'text-gray-600 dark:text-gray-400 mb-8 max-w-xl mx-auto text-balance',
              ),
            ],
            [
              'Start with a template, explore the examples, or read the architecture guide.',
            ],
          ),
          div(
            [
              Class(
                'flex flex-col sm:flex-row items-center justify-center gap-4',
              ),
            ],
            [
              a(
                [Href(Link.gettingStarted), Class('cta-primary')],
                ['Dive In', Icon.arrowRight('w-5 h-5')],
              ),
              a(
                [Href(Link.github), Class('cta-secondary')],
                [Icon.github('w-5 h-5'), 'View on GitHub'],
              ),
            ],
          ),
        ],
      ),
    ],
  )
