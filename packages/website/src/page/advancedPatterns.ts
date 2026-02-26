import { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../html'
import { Link } from '../link'
import type { Model, TableOfContentsEntry } from '../main'
import {
  bullets,
  callout,
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

const viewMemoizationHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'view-memoization',
  text: 'View Memoization',
}

const createLazyHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'create-lazy',
  text: 'createLazy',
}

const createKeyedLazyHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'create-keyed-lazy',
  text: 'createKeyedLazy',
}

const whenToUseLazyHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'when-to-use-lazy',
  text: 'When to Use Lazy Views',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  scalingWithSubmodelsHeader,
  submoduleStructureHeader,
  parentResponsibilitiesHeader,
  modelAsUnionHeader,
  outMessageHeader,
  viewMemoizationHeader,
  createLazyHeader,
  createKeyedLazyHeader,
  whenToUseLazyHeader,
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
      tableOfContentsEntryToHeader(viewMemoizationHeader),
      para(
        'In ',
        link(Link.elmArchitecture, 'the Elm Architecture'),
        ', every model change triggers a full call to ',
        inlineCode('view(model)'),
        '. The entire virtual DOM tree is rebuilt from scratch, then diffed against the previous tree to compute minimal DOM updates. For most apps this is fast enough, but when a view contains a large subtree that rarely changes, the cost of rebuilding and diffing that subtree on every render adds up.',
      ),
      para(
        'Foldkit provides two functions for skipping unnecessary view work: ',
        inlineCode('createLazy'),
        ' for single views and ',
        inlineCode('createKeyedLazy'),
        ' for lists. Both work by caching the VNode returned by a view function. When the function reference and all arguments are referentially equal (',
        inlineCode('==='),
        ") to the previous call, the cached VNode is returned without re-running the view function. Snabbdom's diff algorithm short-circuits when it sees the same VNode reference, so both VNode construction ",
        'and subtree diffing are skipped.',
      ),
      tableOfContentsEntryToHeader(createLazyHeader),
      para(
        inlineCode('createLazy'),
        ' creates a single memoization slot. Call it at module level to create a cache, then use it in your view to wrap an expensive subtree:',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.createLazyHighlighted),
          ],
          [],
        ),
        Snippets.createLazyRaw,
        'Copy createLazy example to clipboard',
        model,
        'mb-8',
      ),
      para(
        'Both the view function and the lazy slot must be defined at module level. If the view function is defined inside the view, a new function reference is created on every render, which means the ',
        inlineCode('fn === previousFn'),
        ' check always fails and the cache is never used.',
      ),
      para(
        'Arguments are compared by reference, not by value. This works naturally with ',
        link('/best-practices#immutable-updates', 'evo'),
        " — when a model field isn't updated, ",
        inlineCode('evo'),
        ' preserves its reference. Only fields that actually changed get new references, so unchanged arguments automatically pass the ',
        inlineCode('==='),
        ' check.',
      ),
      tableOfContentsEntryToHeader(createKeyedLazyHeader),
      para(
        inlineCode('createKeyedLazy'),
        ' creates a ',
        inlineCode('Map'),
        '-backed cache where each key gets its own independent memoization slot. This is designed for lists where individual items change independently:',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.createKeyedLazyHighlighted),
          ],
          [],
        ),
        Snippets.createKeyedLazyRaw,
        'Copy createKeyedLazy example to clipboard',
        model,
        'mb-8',
      ),
      para(
        'When one item in the list changes, only that item is recomputed. All other items return their cached VNodes instantly. This turns an O(n) view rebuild into O(1) for the common case where only one or two items change.',
      ),
      tableOfContentsEntryToHeader(whenToUseLazyHeader),
      para('Lazy views help most when:'),
      bullets(
        'A large view subtree changes infrequently relative to how often the parent re-renders',
        'A list has many items but only a few change at a time (table of contents, contact lists, dashboards)',
        'The view function is expensive to compute (deeply nested trees, many elements)',
      ),
      para(
        'Lazy views are unnecessary for small views, views that change on every model update, or leaf nodes with minimal children. The memoization check itself has a small cost, so applying it everywhere would add overhead without benefit.',
      ),
      callout(
        'How it works under the hood',
        "Foldkit's virtual DOM library (",
        link(Link.snabbdom, 'Snabbdom'),
        ') compares the old and new VNode by reference before diffing. When ',
        inlineCode('oldVnode === newVnode'),
        ', it returns immediately — no attribute comparison, no child reconciliation, no DOM touching. ',
        inlineCode('createLazy'),
        ' and ',
        inlineCode('createKeyedLazy'),
        ' exploit this by returning the exact same VNode object when inputs are unchanged.',
      ),
    ],
  )
