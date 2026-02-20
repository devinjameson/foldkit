import {
  Array,
  Match as M,
  Option,
  Schema as S,
  String as Str,
  pipe,
} from 'effect'

import { OptionExt } from '../../effectExtensions'
import { html } from '../../html'
import type { Html } from '../../html'
import type { Command } from '../../runtime/runtime'
import { ts } from '../../schema'
import { evo } from '../../struct'
import * as Task from '../../task'
import { findFirstEnabledIndex, keyToIndex, wrapIndex } from '../keyboard'

// MODEL

/** Schema for the activation trigger — whether the user interacted via mouse or keyboard. */
export const ActivationTrigger = S.Literal('Pointer', 'Keyboard')
export type ActivationTrigger = typeof ActivationTrigger.Type

/** Schema for the transition animation state, tracking enter/leave phases for CSS transition coordination. */
export const TransitionState = S.Literal(
  'Idle',
  'EnterStart',
  'EnterAnimating',
  'LeaveStart',
  'LeaveAnimating',
)
export type TransitionState = typeof TransitionState.Type

/** Schema for the menu component's state, tracking open/closed status, active item, activation trigger, and typeahead search. */
export const Model = S.Struct({
  id: S.String,
  isOpen: S.Boolean,
  isAnimated: S.Boolean,
  transitionState: TransitionState,
  maybeActiveItemIndex: S.OptionFromSelf(S.Number),
  activationTrigger: ActivationTrigger,
  searchQuery: S.String,
  searchVersion: S.Number,
  maybeLastPointerPosition: S.OptionFromSelf(
    S.Struct({ screenX: S.Number, screenY: S.Number }),
  ),
})

export type Model = typeof Model.Type

// MESSAGE

/** Sent when the menu opens via button click or keyboard. Contains an optional initial active item index — None for pointer, Some for keyboard. */
export const Opened = ts('Opened', {
  maybeActiveItemIndex: S.OptionFromSelf(S.Number),
})
/** Sent when the menu closes via Escape key or backdrop click. */
export const Closed = ts('Closed')
/** Sent when focus leaves the menu items container via Tab key. */
export const ClosedByTab = ts('ClosedByTab')
/** Sent when an item is highlighted via arrow keys or mouse hover. Includes activation trigger. */
export const ItemActivated = ts('ItemActivated', {
  index: S.Number,
  activationTrigger: ActivationTrigger,
})
/** Sent when the mouse leaves an enabled item. */
export const ItemDeactivated = ts('ItemDeactivated')
/** Sent when an item is selected via Enter, Space, or click. */
export const ItemSelected = ts('ItemSelected', { index: S.Number })
/** Sent when a printable character is typed for typeahead search. */
export const Searched = ts('Searched', {
  key: S.String,
  maybeTargetIndex: S.OptionFromSelf(S.Number),
})
/** Sent after the search debounce period to clear the accumulated query. */
export const ClearedSearch = ts('ClearedSearch', { version: S.Number })
/** Sent when the pointer moves over a menu item, carrying screen coordinates for tracked-pointer comparison. */
export const PointerMovedOverItem = ts('PointerMovedOverItem', {
  index: S.Number,
  screenX: S.Number,
  screenY: S.Number,
})
/** Placeholder message used when no action is needed. */
export const NoOp = ts('NoOp')
/** Sent internally when a double-rAF completes, advancing the transition to its animating phase. */
export const TransitionFrameAdvanced = ts('TransitionFrameAdvanced')
/** Sent internally when all CSS transitions on the menu items container have completed. */
export const TransitionEnded = ts('TransitionEnded')

/** Union of all messages the menu component can produce. */
export const Message = S.Union(
  Opened,
  Closed,
  ClosedByTab,
  ItemActivated,
  ItemDeactivated,
  ItemSelected,
  PointerMovedOverItem,
  Searched,
  ClearedSearch,
  NoOp,
  TransitionFrameAdvanced,
  TransitionEnded,
)

export type Opened = typeof Opened.Type
export type Closed = typeof Closed.Type
export type ClosedByTab = typeof ClosedByTab.Type
export type ItemActivated = typeof ItemActivated.Type
export type ItemDeactivated = typeof ItemDeactivated.Type
export type ItemSelected = typeof ItemSelected.Type
export type PointerMovedOverItem = typeof PointerMovedOverItem.Type
export type Searched = typeof Searched.Type
export type ClearedSearch = typeof ClearedSearch.Type
export type NoOp = typeof NoOp.Type
export type TransitionFrameAdvanced = typeof TransitionFrameAdvanced.Type
export type TransitionEnded = typeof TransitionEnded.Type

export type Message = typeof Message.Type

// INIT

const SEARCH_DEBOUNCE_MILLISECONDS = 350

/** Configuration for creating a menu model with `init`. */
export type InitConfig = Readonly<{
  id: string
  isAnimated?: boolean
}>

/** Creates an initial menu model from a config. Defaults to closed with no active item. */
export const init = (config: InitConfig): Model => ({
  id: config.id,
  isOpen: false,
  isAnimated: config.isAnimated ?? false,
  transitionState: 'Idle',
  maybeActiveItemIndex: Option.none(),
  activationTrigger: 'Keyboard',
  searchQuery: '',
  searchVersion: 0,
  maybeLastPointerPosition: Option.none(),
})

// UPDATE

const closedModel = (model: Model): Model =>
  evo(model, {
    isOpen: () => false,
    transitionState: () => (model.isAnimated ? 'LeaveStart' : 'Idle'),
    maybeActiveItemIndex: () => Option.none(),
    activationTrigger: () => 'Keyboard',
    searchQuery: () => '',
    searchVersion: () => 0,
    maybeLastPointerPosition: () => Option.none(),
  })

const buttonSelector = (id: string): string => `#${id}-button`
const itemsSelector = (id: string): string => `#${id}-items`
const itemSelector = (id: string, index: number): string =>
  `#${id}-item-${index}`

/** Processes a menu message and returns the next model and commands. */
export const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Command<Message>>] => {
  const maybeNextFrameCommand = OptionExt.when(
    model.isAnimated,
    Task.nextFrame(() => TransitionFrameAdvanced()),
  )

  return M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Command<Message>>]>(),
    M.tagsExhaustive({
      Opened: ({ maybeActiveItemIndex }) => {
        const nextModel = evo(model, {
          isOpen: () => true,
          transitionState: () => (model.isAnimated ? 'EnterStart' : 'Idle'),
          maybeActiveItemIndex: () => maybeActiveItemIndex,
          activationTrigger: () =>
            Option.match(maybeActiveItemIndex, {
              onNone: () => 'Pointer',
              onSome: () => 'Keyboard',
            }),
          searchQuery: () => '',
          searchVersion: () => 0,
          maybeLastPointerPosition: () => Option.none(),
        })

        return [
          nextModel,
          [
            Task.focus(itemsSelector(model.id), () => NoOp()),
            ...Array.fromOption(maybeNextFrameCommand),
          ],
        ]
      },

      Closed: () => [
        closedModel(model),
        [
          Task.focus(buttonSelector(model.id), () => NoOp()),
          ...Array.fromOption(maybeNextFrameCommand),
        ],
      ],

      ClosedByTab: () => [
        closedModel(model),
        Array.fromOption(maybeNextFrameCommand),
      ],

      ItemActivated: ({ index, activationTrigger }) => [
        evo(model, {
          maybeActiveItemIndex: () => Option.some(index),
          activationTrigger: () => activationTrigger,
        }),
        activationTrigger === 'Keyboard'
          ? [Task.scrollIntoView(itemSelector(model.id, index), () => NoOp())]
          : [],
      ],

      PointerMovedOverItem: ({ index, screenX, screenY }) => {
        const isSamePosition = Option.exists(
          model.maybeLastPointerPosition,
          (position) =>
            position.screenX === screenX && position.screenY === screenY,
        )

        if (isSamePosition) {
          return [model, []]
        }

        return [
          evo(model, {
            maybeActiveItemIndex: () => Option.some(index),
            activationTrigger: () => 'Pointer',
            maybeLastPointerPosition: () => Option.some({ screenX, screenY }),
          }),
          [],
        ]
      },

      ItemDeactivated: () =>
        model.activationTrigger === 'Pointer'
          ? [evo(model, { maybeActiveItemIndex: () => Option.none() }), []]
          : [model, []],

      ItemSelected: () => [
        closedModel(model),
        [
          Task.focus(buttonSelector(model.id), () => NoOp()),
          ...Array.fromOption(maybeNextFrameCommand),
        ],
      ],

      Searched: ({ key, maybeTargetIndex }) => {
        const nextSearchQuery = model.searchQuery + key
        const nextSearchVersion = model.searchVersion + 1

        return [
          evo(model, {
            searchQuery: () => nextSearchQuery,
            searchVersion: () => nextSearchVersion,
            maybeActiveItemIndex: () =>
              Option.orElse(maybeTargetIndex, () => model.maybeActiveItemIndex),
          }),
          [
            Task.delay(SEARCH_DEBOUNCE_MILLISECONDS, () =>
              ClearedSearch({ version: nextSearchVersion }),
            ),
          ],
        ]
      },

      ClearedSearch: ({ version }) => {
        if (version !== model.searchVersion) {
          return [model, []]
        }

        return [evo(model, { searchQuery: () => '' }), []]
      },

      TransitionFrameAdvanced: () =>
        M.value(model.transitionState).pipe(
          M.withReturnType<[Model, ReadonlyArray<Command<Message>>]>(),
          M.when('EnterStart', () => [
            evo(model, { transitionState: () => 'EnterAnimating' }),
            [
              Task.waitForTransitions(itemsSelector(model.id), () =>
                TransitionEnded(),
              ),
            ],
          ]),
          M.when('LeaveStart', () => [
            evo(model, { transitionState: () => 'LeaveAnimating' }),
            [
              Task.waitForTransitions(itemsSelector(model.id), () =>
                TransitionEnded(),
              ),
            ],
          ]),
          M.orElse(() => [model, []]),
        ),

      TransitionEnded: () =>
        M.value(model.transitionState).pipe(
          M.withReturnType<[Model, ReadonlyArray<Command<Message>>]>(),
          M.whenOr('EnterAnimating', 'LeaveAnimating', () => [
            evo(model, { transitionState: () => 'Idle' }),
            [],
          ]),
          M.orElse(() => [model, []]),
        ),

      NoOp: () => [model, []],
    }),
  )
}

// VIEW

/** Configuration for an individual menu item's appearance. */
export type ItemConfig = Readonly<{
  className: string
  content: Html
}>

/** Configuration for a group heading rendered above a group of items. */
export type GroupHeading = Readonly<{
  content: Html
  className: string
}>

/** Configuration for rendering a menu with `view`. */
export type ViewConfig<Message, Item extends string> = Readonly<{
  model: Model
  toMessage: (
    message:
      | Opened
      | Closed
      | ClosedByTab
      | ItemActivated
      | ItemDeactivated
      | ItemSelected
      | PointerMovedOverItem
      | Searched,
  ) => Message
  items: ReadonlyArray<Item>
  itemToConfig: (
    item: Item,
    context: Readonly<{ isActive: boolean; isDisabled: boolean }>,
  ) => ItemConfig
  isItemDisabled?: (item: Item, index: number) => boolean
  itemToSearchText?: (item: Item, index: number) => string
  isButtonDisabled?: boolean
  buttonContent: Html
  buttonClassName: string
  itemsClassName: string
  backdropClassName: string
  className?: string
  itemGroupKey?: (item: Item, index: number) => string
  groupToHeading?: (groupKey: string) => GroupHeading | undefined
  groupClassName?: string
  separatorClassName?: string
}>

type Segment<A> = Readonly<{ key: string; items: ReadonlyArray<A> }>

export const groupContiguous = <A>(
  items: ReadonlyArray<A>,
  toKey: (item: A, index: number) => string,
): ReadonlyArray<Segment<A>> => {
  const tagged = Array.map(items, (item, index) => ({
    key: toKey(item, index),
    item,
  }))

  return Array.chop(tagged, (nonEmpty) => {
    const key = Array.headNonEmpty(nonEmpty).key
    const [matching, rest] = Array.span(
      nonEmpty,
      (tagged) => tagged.key === key,
    )
    return [{ key, items: Array.map(matching, ({ item }) => item) }, rest]
  })
}

const itemId = (id: string, index: number): string => `${id}-item-${index}`

/** Finds the first enabled item whose search text starts with the query, searching forward from the active item and wrapping around. On a fresh search, starts after the active item; on a refinement, includes the active item. */
export const resolveTypeaheadMatch = <Item extends string>(
  items: ReadonlyArray<Item>,
  query: string,
  maybeActiveItemIndex: Option.Option<number>,
  isDisabled: (index: number) => boolean,
  itemToSearchText: (item: Item, index: number) => string,
  isRefinement: boolean,
): Option.Option<number> => {
  const lowerQuery = Str.toLowerCase(query)
  const offset = isRefinement ? 0 : 1
  const startIndex = Option.match(maybeActiveItemIndex, {
    onNone: () => 0,
    onSome: (index) => index + offset,
  })

  const isEnabledMatch = (index: number): boolean =>
    !isDisabled(index) &&
    pipe(
      items,
      Array.get(index),
      Option.exists((item) =>
        pipe(
          itemToSearchText(item, index),
          Str.toLowerCase,
          Str.startsWith(lowerQuery),
        ),
      ),
    )

  return pipe(
    items.length,
    Array.makeBy((step) => wrapIndex(startIndex + step, items.length)),
    Array.findFirst(isEnabledMatch),
  )
}

/** Renders a headless menu with typeahead search, keyboard navigation, and aria-activedescendant focus management. */
export const view = <Message, Item extends string>(
  config: ViewConfig<Message, Item>,
): Html => {
  const {
    div,
    AriaActiveDescendant,
    AriaControls,
    AriaDisabled,
    AriaExpanded,
    AriaHasPopup,
    AriaLabelledBy,
    Class,
    DataAttribute,
    Id,
    OnBlur,
    OnClick,
    OnKeyDownPreventDefault,
    OnMouseLeave,
    OnPointerMove,
    Role,
    Tabindex,
    Type,
    keyed,
  } = html<Message>()

  const {
    model: { id, isOpen, transitionState, maybeActiveItemIndex, searchQuery },
    toMessage,
    items,
    itemToConfig,
    isItemDisabled,
    itemToSearchText = (item: Item) => item,
    isButtonDisabled,
    buttonContent,
    buttonClassName,
    itemsClassName,
    backdropClassName,
    className,
    itemGroupKey,
    groupToHeading,
    groupClassName,
    separatorClassName,
  } = config

  const isLeaving =
    transitionState === 'LeaveStart' || transitionState === 'LeaveAnimating'
  const isVisible = isOpen || isLeaving

  const transitionAttributes: ReadonlyArray<ReturnType<typeof DataAttribute>> =
    M.value(transitionState).pipe(
      M.when('EnterStart', () => [
        DataAttribute('closed', ''),
        DataAttribute('enter', ''),
        DataAttribute('transition', ''),
      ]),
      M.when('EnterAnimating', () => [
        DataAttribute('enter', ''),
        DataAttribute('transition', ''),
      ]),
      M.when('LeaveStart', () => [
        DataAttribute('leave', ''),
        DataAttribute('transition', ''),
      ]),
      M.when('LeaveAnimating', () => [
        DataAttribute('closed', ''),
        DataAttribute('leave', ''),
        DataAttribute('transition', ''),
      ]),
      M.orElse(() => []),
    )

  const isDisabled = (index: number): boolean =>
    !!isItemDisabled &&
    pipe(
      items,
      Array.get(index),
      Option.exists((item) => isItemDisabled(item, index)),
    )

  const firstEnabledIndex = findFirstEnabledIndex(
    items.length,
    0,
    isDisabled,
  )(0, 1)

  const lastEnabledIndex = findFirstEnabledIndex(
    items.length,
    0,
    isDisabled,
  )(items.length - 1, -1)

  const handleButtonKeyDown = (key: string): Option.Option<Message> =>
    M.value(key).pipe(
      M.whenOr('Enter', ' ', 'ArrowDown', () =>
        Option.some(
          toMessage(
            Opened({
              maybeActiveItemIndex: Option.some(firstEnabledIndex),
            }),
          ),
        ),
      ),
      M.when('ArrowUp', () =>
        Option.some(
          toMessage(
            Opened({
              maybeActiveItemIndex: Option.some(lastEnabledIndex),
            }),
          ),
        ),
      ),
      M.orElse(() => Option.none()),
    )

  const handleButtonClick = (): Message =>
    isOpen
      ? toMessage(Closed())
      : toMessage(Opened({ maybeActiveItemIndex: Option.none() }))

  const resolveActiveIndex = keyToIndex(
    'ArrowDown',
    'ArrowUp',
    items.length,
    Option.getOrElse(maybeActiveItemIndex, () => 0),
    isDisabled,
  )

  const handleItemsKeyDown = (key: string): Option.Option<Message> =>
    M.value(key).pipe(
      M.when('Escape', () => Option.some(toMessage(Closed()))),
      M.whenOr('Enter', ' ', () =>
        Option.map(maybeActiveItemIndex, (index) =>
          toMessage(ItemSelected({ index })),
        ),
      ),
      M.whenOr(
        'ArrowDown',
        'ArrowUp',
        'Home',
        'End',
        'PageUp',
        'PageDown',
        () =>
          Option.some(
            toMessage(
              ItemActivated({
                index: resolveActiveIndex(key),
                activationTrigger: 'Keyboard',
              }),
            ),
          ),
      ),
      M.when(
        (key) => key.length === 1,
        () => {
          const nextQuery = searchQuery + key
          const maybeTargetIndex = resolveTypeaheadMatch(
            items,
            nextQuery,
            maybeActiveItemIndex,
            isDisabled,
            itemToSearchText,
            Str.isNonEmpty(searchQuery),
          )

          return Option.some(toMessage(Searched({ key, maybeTargetIndex })))
        },
      ),
      M.orElse(() => Option.none()),
    )

  const buttonAttributes = [
    Id(`${id}-button`),
    Type('button'),
    Class(buttonClassName),
    AriaHasPopup('menu'),
    AriaExpanded(isVisible),
    AriaControls(`${id}-items`),
    ...(isButtonDisabled
      ? [AriaDisabled(true), DataAttribute('disabled', '')]
      : [
          OnKeyDownPreventDefault(handleButtonKeyDown),
          OnClick(handleButtonClick()),
        ]),
    ...(isVisible ? [DataAttribute('open', '')] : []),
  ]

  const maybeActiveDescendant = Option.match(maybeActiveItemIndex, {
    onNone: () => [],
    onSome: (index) => [AriaActiveDescendant(itemId(id, index))],
  })

  const itemsContainerAttributes = [
    Id(`${id}-items`),
    Role('menu'),
    AriaLabelledBy(`${id}-button`),
    ...maybeActiveDescendant,
    Tabindex(0),
    Class(itemsClassName),
    ...transitionAttributes,
    ...(isLeaving
      ? []
      : [
          OnKeyDownPreventDefault(handleItemsKeyDown),
          OnBlur(toMessage(ClosedByTab())),
        ]),
  ]

  const menuItems = Array.map(items, (item, index) => {
    const isActiveItem = Option.exists(
      maybeActiveItemIndex,
      (activeIndex) => activeIndex === index,
    )
    const isDisabledItem = isDisabled(index)
    const itemConfig = itemToConfig(item, {
      isActive: isActiveItem,
      isDisabled: isDisabledItem,
    })

    const isInteractive = !isDisabledItem && !isLeaving

    return keyed('div')(
      itemId(id, index),
      [
        Id(itemId(id, index)),
        Role('menuitem'),
        Tabindex(-1),
        Class(itemConfig.className),
        ...(isActiveItem ? [DataAttribute('active', '')] : []),
        ...(isDisabledItem
          ? [AriaDisabled(true), DataAttribute('disabled', '')]
          : []),
        ...(isInteractive
          ? [
              OnClick(toMessage(ItemSelected({ index }))),
              OnPointerMove((screenX, screenY) =>
                toMessage(PointerMovedOverItem({ index, screenX, screenY })),
              ),
              OnMouseLeave(toMessage(ItemDeactivated())),
            ]
          : []),
      ],
      [itemConfig.content],
    )
  })

  const renderGroupedItems = (): ReadonlyArray<Html> => {
    if (!itemGroupKey) {
      return menuItems
    }

    const segments = groupContiguous(menuItems, (_, index) =>
      Array.get(items, index).pipe(
        Option.match({
          onNone: () => '',
          onSome: (item) => itemGroupKey(item, index),
        }),
      ),
    )

    return Array.flatMap(segments, (segment, segmentIndex) => {
      const maybeHeading = Option.fromNullable(
        groupToHeading && groupToHeading(segment.key),
      )

      const headingId = `${id}-heading-${segment.key}`

      const headingElement = Option.match(maybeHeading, {
        onNone: () => [],
        onSome: (heading) => [
          keyed('div')(
            headingId,
            [Id(headingId), Role('presentation'), Class(heading.className)],
            [heading.content],
          ),
        ],
      })

      const groupContent = [...headingElement, ...segment.items]

      const groupElement = keyed('div')(
        `${id}-group-${segment.key}`,
        [
          Role('group'),
          ...(Option.isSome(maybeHeading) ? [AriaLabelledBy(headingId)] : []),
          ...(groupClassName ? [Class(groupClassName)] : []),
        ],
        groupContent,
      )

      const separator =
        segmentIndex > 0 && separatorClassName
          ? [
              keyed('div')(
                `${id}-separator-${segmentIndex}`,
                [Role('separator'), Class(separatorClassName)],
                [],
              ),
            ]
          : []

      return [...separator, groupElement]
    })
  }

  const backdrop = keyed('div')(
    `${id}-backdrop`,
    [
      Class(backdropClassName),
      ...(isLeaving ? [] : [OnClick(toMessage(Closed()))]),
    ],
    [],
  )

  const renderedItems = renderGroupedItems()

  const visibleContent = [
    backdrop,
    keyed('div')(
      `${id}-items-container`,
      itemsContainerAttributes,
      renderedItems,
    ),
  ]

  const wrapperAttributes = [
    ...(className ? [Class(className)] : []),
    ...(isVisible ? [DataAttribute('open', '')] : []),
  ]

  return div(wrapperAttributes, [
    keyed('button')(`${id}-button`, buttonAttributes, [buttonContent]),
    ...(isVisible ? visibleContent : []),
  ])
}
