import { Class, Html, div, pre } from 'foldkit/html'

import { Link } from '../link'
import type { Model, TableOfContentsEntry } from '../main'
import { heading, link, para } from '../prose'
import { codeBlock } from '../view/codeBlock'

const CREATE_FOLDKIT_APP_COMMAND =
  'npx create-foldkit-app@latest --wizard'

type Header = { id: string; text: string }

const quickStartHeader: Header = {
  id: 'quickStart',
  text: 'Quick Start',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  { level: 'h2', ...quickStartHeader },
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
        pre(
          [Class('bg-gray-900 text-gray-100 rounded-lg text-sm')],
          [CREATE_FOLDKIT_APP_COMMAND],
        ),
        CREATE_FOLDKIT_APP_COMMAND,
        'Copy command to clipboard',
        model,
      ),
    ],
  )
