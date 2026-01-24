import { Html } from 'foldkit/html'

import { Class, div, li, ul } from '../html'
import { Link } from '../link'
import type { Model, TableOfContentsEntry } from '../main'
import { heading, inlineCode, link, para, section } from '../prose'
import { codeBlock } from '../view/codeBlock'

const CREATE_FOLDKIT_APP_COMMAND =
  'npx create-foldkit-app@latest --wizard'
const DEV_PNPM = 'pnpm dev'
const DEV_NPM = 'npm run dev'
const DEV_YARN = 'yarn dev'

type Header = { id: string; text: string }

const quickStartHeader: Header = {
  id: 'quickStart',
  text: 'Quick Start',
}

const projectStructureHeader: Header = {
  id: 'projectStructure',
  text: 'Project Structure',
}

const nextStepsHeader: Header = {
  id: 'nextSteps',
  text: 'Next Steps',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  { level: 'h2', ...quickStartHeader },
  { level: 'h2', ...projectStructureHeader },
  { level: 'h2', ...nextStepsHeader },
]

export const view = (model: Model): Html =>
  div(
    [],
    [
      heading(1, 'gettingStarted', 'Getting Started'),
      heading(2, quickStartHeader.id, quickStartHeader.text),
      para(
        link(Link.createFoldkitApp, 'Create Foldkit app'),
        " is the recommended way to get started with Foldkit. You'll be able to select the ",
        link(Link.foldkitExamples, 'example'),
        " you would like to start with and the package manager you'd like to use.",
      ),
      codeBlock(
        CREATE_FOLDKIT_APP_COMMAND,
        'Copy command to clipboard',
        model,
        'mb-8',
      ),
      para(
        'Once the project is created, navigate to the project directory and start the dev server:',
      ),
      div(
        [Class('flex gap-2 flex-wrap')],
        [
          codeBlock(DEV_PNPM, 'Copy pnpm command', model),
          codeBlock(DEV_NPM, 'Copy npm command', model),
          codeBlock(DEV_YARN, 'Copy yarn command', model),
        ],
      ),
      section(
        projectStructureHeader.id,
        projectStructureHeader.text,
        [
          para('A new Foldkit project has the following structure:'),
          ul(
            [Class('list-none mb-6 space-y-2 font-mono text-sm')],
            [
              li(
                [],
                [
                  inlineCode('src/main.ts'),
                  ' — Your application code',
                ],
              ),
              li(
                [],
                [inlineCode('index.html'), ' — HTML entry point'],
              ),
              li(
                [],
                [
                  inlineCode('vite.config.ts'),
                  ' — Vite configuration with Foldkit HMR plugin',
                ],
              ),
              li(
                [],
                [
                  inlineCode('tsconfig.json'),
                  ' — TypeScript configuration',
                ],
              ),
              li(
                [],
                [
                  inlineCode('package.json'),
                  ' — Dependencies and scripts',
                ],
              ),
            ],
          ),
          para(
            'The ',
            inlineCode('src/main.ts'),
            ' file is the entry point for your application. In the starter examples, it contains the Model, Messages, Update function, and View all in one file. As your app grows, you can split these into separate modules.',
          ),
        ],
      ),
      section(nextStepsHeader.id, nextStepsHeader.text, [
        para(
          'Now that you have a running app, head to the ',
          link(
            '/architecture-and-concepts',
            'Architecture & Concepts',
          ),
          ' page to understand how the pieces fit together.',
        ),
      ]),
    ],
  )
