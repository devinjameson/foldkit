import { Html } from 'foldkit/html'

import { Class, InnerHTML, div, li, ul } from '../html'
import { Link } from '../link'
import type { Model, TableOfContentsEntry } from '../main'
import { heading, inlineCode, link, para, section } from '../prose'
import * as Snippets from '../snippet'
import { codeBlock, highlightedCodeBlock } from '../view/codeBlock'

type Header = { id: string; text: string }

const startingSimpleHeader: Header = {
  id: 'starting-simple',
  text: 'Starting Simple',
}

const scalingWithSubmodelsHeader: Header = {
  id: 'scaling-with-submodels',
  text: 'Scaling with Submodels',
}

const fileLayoutHeader: Header = {
  id: 'file-layout',
  text: 'File Layout',
}

const domainModulesHeader: Header = {
  id: 'domain-modules',
  text: 'Domain Modules',
}

const indexReexportsHeader: Header = {
  id: 'index-reexports',
  text: 'Index Re-exports',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  { level: 'h2', ...startingSimpleHeader },
  { level: 'h2', ...scalingWithSubmodelsHeader },
  { level: 'h2', ...fileLayoutHeader },
  { level: 'h2', ...domainModulesHeader },
  { level: 'h2', ...indexReexportsHeader },
]

export const view = (model: Model): Html =>
  div(
    [],
    [
      heading(1, 'project-organization', 'Project Organization'),
      para(
        'Foldkit apps can start in a single ',
        inlineCode('main.ts'),
        " and split into modules as they grow. Here's how to organize your code as complexity increases.",
      ),
      section(startingSimpleHeader.id, startingSimpleHeader.text, [
        para(
          'The simplest Foldkit apps keep everything in ',
          inlineCode('main.ts'),
          ': Model, Messages, init, update, and view. The ',
          link(Link.exampleCounter, 'Counter example'),
          ' is a good reference.',
        ),
        para(
          "This is fine for small apps. You don't need to split into multiple files until the single file becomes hard to navigate.",
        ),
      ]),
      section(
        scalingWithSubmodelsHeader.id,
        scalingWithSubmodelsHeader.text,
        [
          para(
            'As your app grows, a single Model/Message/Update becomes unwieldy. The submodel pattern lets you split your app into self-contained modules.',
          ),
          heading(3, 'submodule-structure', 'Submodule Structure'),
          ul(
            [Class('list-disc mb-4 space-y-1 ml-4')],
            [
              li(
                [],
                ['Its own Model, Message, init, update, and view'],
              ),
              li(
                [],
                [
                  'A view that takes a ',
                  inlineCode('toMessage'),
                  ' function to wrap its messages',
                ],
              ),
            ],
          ),
          heading(
            3,
            'parentResponsibilities',
            'Parent Responsibilities',
          ),
          ul(
            [Class('list-disc mb-4 space-y-1 ml-4')],
            [
              li(
                [],
                [
                  'Embeds the child Model: ',
                  inlineCode('productsPage: Products.Model'),
                ],
              ),
              li(
                [],
                [
                  'Has a wrapper Message: ',
                  inlineCode(
                    'ProductsMessage({ message: Products.Message })',
                  ),
                ],
              ),
              li(
                [],
                [
                  'Delegates in update, then rewraps returned Commands',
                ],
              ),
              li([], ['Passes a wrapper function to the child view']),
            ],
          ),
          para(
            'See the ',
            link(
              Link.exampleShoppingCartSubmodel,
              'Shopping Cart example',
            ),
            ' for a complete implementation of this pattern.',
          ),
        ],
      ),
      section(fileLayoutHeader.id, fileLayoutHeader.text, [
        para(
          'Once you split into submodules, a consistent file layout helps you navigate the codebase. Each page or feature becomes a folder:',
        ),
        codeBlock(
          Snippets.fileLayoutRaw,
          'Copy file layout to clipboard',
          model,
          'mb-8',
        ),
        para(
          'Each page folder mirrors the Elm Architecture: Model defines state, Message defines events, update handles transitions, view renders HTML, and init sets up initial state.',
        ),
        para(
          'As pages grow, you can further split into subfolders. For example, the ',
          link(
            Link.typingTerminalRoomSource,
            'Typing Terminal room source',
          ),
          ' has ',
          inlineCode('view/'),
          ' and ',
          inlineCode('update/'),
          ' subfolders for its Room page.',
        ),
      ]),
      section(domainModulesHeader.id, domainModulesHeader.text, [
        para(
          'For business logic that spans multiple modules, create a ',
          inlineCode('domain/'),
          ' folder. Each file represents a domain concept with its schema and pure functions:',
        ),
        highlightedCodeBlock(
          div(
            [
              Class('text-sm'),
              InnerHTML(Snippets.domainModuleHighlighted),
            ],
            [],
          ),
          Snippets.domainModuleRaw,
          'Copy domain module to clipboard',
          model,
          'mb-8',
        ),
        para(
          'This keeps related types and operations together. You can import the module and use ',
          inlineCode('Cart.addItem'),
          ', ',
          inlineCode('Cart.removeItem'),
          ', etc.',
        ),
      ]),
      section(indexReexportsHeader.id, indexReexportsHeader.text, [
        para(
          'Use ',
          inlineCode('index.ts'),
          ' files to create clean namespace imports:',
        ),
        highlightedCodeBlock(
          div(
            [
              Class('text-sm'),
              InnerHTML(Snippets.indexReexportsHighlighted),
            ],
            [],
          ),
          Snippets.indexReexportsRaw,
          'Copy index re-exports to clipboard',
          model,
          'mb-8',
        ),
        para('Then import and use the namespace:'),
        highlightedCodeBlock(
          div(
            [
              Class('text-sm'),
              InnerHTML(Snippets.indexUsageHighlighted),
            ],
            [],
          ),
          Snippets.indexUsageRaw,
          'Copy namespace usage to clipboard',
          model,
          'mb-8',
        ),
        para(
          'This pattern gives you discoverability (',
          inlineCode('Home.'),
          ' shows everything available) while keeping imports clean.',
        ),
      ]),
    ],
  )
