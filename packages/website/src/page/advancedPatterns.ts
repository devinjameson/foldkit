import { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../html'
import { Link } from '../link'
import type { Model, TableOfContentsEntry } from '../main'
import {
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../prose'
import * as Snippets from '../snippet'
import { highlightedCodeBlock } from '../view/codeBlock'

const scalingWithSubmodelsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'scaling-with-submodels',
  text: 'Scaling with Submodels',
}

const submoduleStructureHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'submodule-structure',
  text: 'Submodule Structure',
}

const parentResponsibilitiesHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'parentResponsibilities',
  text: 'Parent Responsibilities',
}

const modelAsUnionHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'model-as-union',
  text: 'Model as Union',
}

const outMessageHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'parent-child-communication',
  text: 'Parent-Child Communication with OutMessage',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  scalingWithSubmodelsHeader,
  submoduleStructureHeader,
  parentResponsibilitiesHeader,
  modelAsUnionHeader,
  outMessageHeader,
]

export const view = (model: Model): Html =>
  div(
    [],
    [
      pageTitle('advanced-patterns', 'Advanced Patterns'),
      para(
        'As your Foldkit app grows, these patterns help you manage complexity while keeping code organized and maintainable.',
      ),
      tableOfContentsEntryToHeader(scalingWithSubmodelsHeader),
      para(
        'As your app grows, a single Model/Message/Update becomes unwieldy. The submodel pattern lets you split your app into self-contained modules, each with its own Model, Message, init, update, and view.',
      ),
      tableOfContentsEntryToHeader(submoduleStructureHeader),
      para('Each submodule has its own Model, Message, and update:'),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.submodelChildModuleHighlighted),
          ],
          [],
        ),
        Snippets.submodelChildModuleRaw,
        'Copy child module to clipboard',
        model,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(parentResponsibilitiesHeader),
      para('The parent model embeds the child model as a field:'),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.submodelParentModelHighlighted),
          ],
          [],
        ),
        Snippets.submodelParentModelRaw,
        'Copy parent model to clipboard',
        model,
        'mb-8',
      ),
      para(
        'The parent has a wrapper message that contains the child message:',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.submodelWrapperMessageHighlighted),
          ],
          [],
        ),
        Snippets.submodelWrapperMessageRaw,
        'Copy wrapper message to clipboard',
        model,
        'mb-8',
      ),
      para(
        'In update, delegate to the child and rewrap returned commands:',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.submodelUpdateDelegationHighlighted),
          ],
          [],
        ),
        Snippets.submodelUpdateDelegationRaw,
        'Copy update delegation to clipboard',
        model,
        'mb-8',
      ),
      para(
        'See the ',
        link(
          Link.exampleShoppingCartSubmodel,
          'Shopping Cart example',
        ),
        ' for a complete implementation of this pattern.',
      ),
      tableOfContentsEntryToHeader(modelAsUnionHeader),
      para(
        'When your app has mutually exclusive states—like logged in vs logged out, wizard steps, or game phases—you can model your root state as a union of variants rather than embedding submodels in a struct.',
      ),
      para(
        'Define each variant as a tagged struct, then combine them with ',
        inlineCode('S.Union'),
        ':',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.modelAsUnionRootHighlighted),
          ],
          [],
        ),
        Snippets.modelAsUnionRootRaw,
        'Copy model to clipboard',
        model,
        'mb-8',
      ),
      para(
        'In the view, use ',
        inlineCode('Match.tagsExhaustive'),
        ' to handle each variant:',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.modelAsUnionViewHighlighted),
          ],
          [],
        ),
        Snippets.modelAsUnionViewRaw,
        'Copy view to clipboard',
        model,
        'mb-8',
      ),
      para(
        'To transition between states, return a different variant from update:',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.modelAsUnionTransitionHighlighted),
          ],
          [],
        ),
        Snippets.modelAsUnionTransitionRaw,
        'Copy transition to clipboard',
        model,
        'mb-8',
      ),
      para(
        'See the ',
        link(Link.exampleAuth, 'Auth example'),
        ' for a complete implementation.',
      ),
      para(
        'If you need shared state across union variants, wrap the union in a struct:',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.modelAsUnionSharedStateHighlighted),
          ],
          [],
        ),
        Snippets.modelAsUnionSharedStateRaw,
        'Copy shared state model to clipboard',
        model,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(outMessageHeader),
      para(
        "Sometimes a child module needs to trigger a change in the parent's state. Child modules cannot directly update parent state—they only manage their own. The ",
        inlineCode('OutMessage'),
        ' pattern solves this—children emit semantic events that parents then handle.',
      ),
      para(
        'Define ',
        inlineCode('OutMessage'),
        ' schemas alongside your child ',
        inlineCode('Message'),
        ':',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.outMessageDefinitionHighlighted),
          ],
          [],
        ),
        Snippets.outMessageDefinitionRaw,
        'Copy OutMessage definition to clipboard',
        model,
        'mb-8',
      ),
      para(
        'The child update function returns a 3-tuple: model, commands, and an optional ',
        inlineCode('OutMessage'),
        ':',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.outMessageChildUpdateHighlighted),
          ],
          [],
        ),
        Snippets.outMessageChildUpdateRaw,
        'Copy child update to clipboard',
        model,
        'mb-8',
      ),
      para(
        'The parent handles the ',
        inlineCode('OutMessage'),
        ' with ',
        inlineCode('Option.match'),
        ', taking action when present:',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.outMessageParentHandleHighlighted),
          ],
          [],
        ),
        Snippets.outMessageParentHandleRaw,
        'Copy parent handling to clipboard',
        model,
        'mb-8',
      ),
      para(
        'Use ',
        inlineCode('Array.map'),
        ' with ',
        inlineCode('Effect.map'),
        ' to wrap child commands in parent message types:',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.outMessageMappedCommandsHighlighted),
          ],
          [],
        ),
        Snippets.outMessageMappedCommandsRaw,
        'Copy command mapping to clipboard',
        model,
        'mb-8',
      ),
      para(
        inlineCode('OutMessage'),
        's are semantic events (like ',
        inlineCode('LoginSucceeded'),
        ') while commands are side effects. This separation keeps child modules focused on their domain while parents handle cross-cutting concerns. See the ',
        link(Link.exampleAuth, 'Auth example'),
        ' for a complete implementation.',
      ),
    ],
  )
