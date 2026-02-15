import {
  Array,
  Match as M,
  Option,
  Predicate,
  Schema as S,
  String,
  pipe,
} from 'effect'

import { html } from '../../html'
import type { Html, TagName } from '../../html'
import type { Command } from '../../runtime/runtime'
import { ts } from '../../schema'
import { evo } from '../../struct'
import * as Task from '../../task'

// MODEL

/** Controls the tab list layout direction and which arrow keys navigate between tabs. */
export const Orientation = S.Literal('Horizontal', 'Vertical')
export type Orientation = typeof Orientation.Type

/** Controls whether tabs activate on focus (`Automatic`) or require an explicit selection (`Manual`). */
export const ActivationMode = S.Literal('Automatic', 'Manual')
export type ActivationMode = typeof ActivationMode.Type

/** Schema for the tabs component's state, tracking active/focused indices, orientation, and activation mode. */
export const Model = S.Struct({
  id: S.String,
  activeIndex: S.Number,
  focusedIndex: S.Number,
  orientation: Orientation,
  activationMode: ActivationMode,
})

export type Model = typeof Model.Type

// MESSAGE

/** Sent when a tab is selected via click or keyboard. Updates both the active and focused indices. */
export const TabSelected = ts('TabSelected', { index: S.Number })
/** Sent when a tab receives keyboard focus in `Manual` mode without being activated. */
export const TabFocused = ts('TabFocused', { index: S.Number })
/** Placeholder message used when no action is needed, such as after a focus command completes. */
export const NoOp = ts('NoOp')

/** Union of all messages the tabs component can produce. */
export const Message = S.Union(TabSelected, TabFocused, NoOp)

export type TabSelected = typeof TabSelected.Type
export type TabFocused = typeof TabFocused.Type
export type NoOp = typeof NoOp.Type

export type Message = typeof Message.Type

// INIT

/** Configuration for creating a tabs model with `init`. */
export type InitConfig = {
  readonly id: string
  readonly activeIndex?: number
  readonly orientation?: Orientation
  readonly activationMode?: ActivationMode
}

/** Creates an initial tabs model from a config. Defaults to first tab, horizontal orientation, and automatic activation. */
export const init = (config: InitConfig): Model => {
  const activeIndex = config.activeIndex ?? 0

  return {
    id: config.id,
    activeIndex,
    focusedIndex: activeIndex,
    orientation: config.orientation ?? 'Horizontal',
    activationMode: config.activationMode ?? 'Automatic',
  }
}

// UPDATE

/** Processes a tabs message and returns the next model and commands. */
export const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Command<Message>>]>(),
    M.tagsExhaustive({
      TabSelected: ({ index }) => {
        const tabSelector = `#${tabId(model.id, index)}`

        return [
          evo(model, {
            activeIndex: () => index,
            focusedIndex: () => index,
          }),
          [Task.focus(tabSelector, () => NoOp.make())],
        ]
      },
      TabFocused: ({ index }) => {
        const tabSelector = `#${tabId(model.id, index)}`

        return [
          evo(model, { focusedIndex: () => index }),
          [Task.focus(tabSelector, () => NoOp.make())],
        ]
      },
      NoOp: () => [model, []],
    }),
  )

// KEYBOARD

export const wrapIndex = (index: number, length: number): number =>
  ((index % length) + length) % length

export const findFirstEnabledIndex =
  (
    tabCount: number,
    focusedIndex: number,
    isDisabled: (index: number) => boolean,
  ) =>
  (startIndex: number, direction: 1 | -1): number =>
    pipe(
      tabCount,
      Array.makeBy((step) =>
        wrapIndex(startIndex + step * direction, tabCount),
      ),
      Array.findFirst(Predicate.not(isDisabled)),
      Option.getOrElse(() => focusedIndex),
    )

export const keyToIndex = (
  nextKey: string,
  previousKey: string,
  tabCount: number,
  focusedIndex: number,
  isDisabled: (index: number) => boolean,
): ((key: string) => number) => {
  const find = findFirstEnabledIndex(tabCount, focusedIndex, isDisabled)

  return (key: string): number =>
    M.value(key).pipe(
      M.when(nextKey, () => find(focusedIndex + 1, 1)),
      M.when(previousKey, () => find(focusedIndex - 1, -1)),
      M.whenOr('Home', 'PageUp', () => find(0, 1)),
      M.whenOr('End', 'PageDown', () => find(tabCount - 1, -1)),
      M.orElse(() => focusedIndex),
    )
}

// VIEW

/** Configuration for an individual tab's button and panel content. */
export type TabConfig = {
  readonly buttonClassName: string
  readonly buttonContent: Html
  readonly panelClassName: string
  readonly panelContent: Html
}

/** Configuration for rendering a tab group with `view`. */
export type ViewConfig<Message, Tab extends string> = {
  readonly model: Model
  readonly toMessage: (message: TabSelected | TabFocused | NoOp) => Message
  readonly tabs: ReadonlyArray<Tab>
  readonly tabToConfig: (tab: Tab, context: { isActive: boolean }) => TabConfig
  readonly isTabDisabled?: (tab: Tab, index: number) => boolean
  readonly persistPanels?: boolean
  readonly tabListElement?: TagName
  readonly tabElement?: TagName
  readonly panelElement?: TagName
  readonly className?: string
  readonly tabListClassName?: string
}

const tabPanelId = (id: string, index: number): string => `${id}-panel-${index}`

const tabId = (id: string, index: number): string => `${id}-tab-${index}`

/** Renders a headless tab group with accessible ARIA roles, roving tabindex, and keyboard navigation. */
export const view = <Message, Tab extends string>(
  config: ViewConfig<Message, Tab>,
): Html => {
  const {
    div,
    empty,
    AriaControls,
    AriaDisabled,
    AriaLabelledBy,
    AriaOrientation,
    AriaSelected,
    Class,
    DataAttribute,
    Disabled,
    Hidden,
    Id,
    OnClick,
    OnKeyDown,
    Role,
    Tabindex,
    Type,
    keyed,
  } = html<Message>()

  const {
    model,
    model: { id, orientation, activationMode, focusedIndex },
    toMessage,
    tabs,
    tabToConfig,
    isTabDisabled,
    persistPanels,
    tabListElement = 'div',
    tabElement = 'button',
    panelElement = 'div',
    className,
    tabListClassName,
  } = config

  const isDisabled = (index: number): boolean =>
    !!isTabDisabled &&
    pipe(
      tabs,
      Array.get(index),
      Option.exists((tab) => isTabDisabled(tab, index)),
    )

  const { nextKey, previousKey } = M.value(orientation).pipe(
    M.when('Horizontal', () => ({
      nextKey: 'ArrowRight',
      previousKey: 'ArrowLeft',
    })),
    M.when('Vertical', () => ({
      nextKey: 'ArrowDown',
      previousKey: 'ArrowUp',
    })),
    M.exhaustive,
  )

  const resolveKeyIndex = keyToIndex(
    nextKey,
    previousKey,
    tabs.length,
    focusedIndex,
    isDisabled,
  )

  const handleAutomaticKeyDown = (key: string): Message =>
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    M.value(key).pipe(
      M.whenOr(nextKey, previousKey, 'Home', 'End', 'PageUp', 'PageDown', () =>
        toMessage(TabSelected.make({ index: resolveKeyIndex(key) })),
      ),
      M.whenOr('Enter', ' ', () =>
        toMessage(TabSelected.make({ index: focusedIndex })),
      ),
      M.orElse(() => toMessage(NoOp.make())),
    ) as Message

  const handleManualKeyDown = (key: string): Message =>
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    M.value(key).pipe(
      M.whenOr(nextKey, previousKey, 'Home', 'End', 'PageUp', 'PageDown', () =>
        toMessage(TabFocused.make({ index: resolveKeyIndex(key) })),
      ),
      M.whenOr('Enter', ' ', () =>
        toMessage(TabSelected.make({ index: focusedIndex })),
      ),
      M.orElse(() => toMessage(NoOp.make())),
    ) as Message

  const handleKeyDown = (key: string): Message =>
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    M.value(activationMode).pipe(
      M.when('Automatic', () => handleAutomaticKeyDown(key)),
      M.when('Manual', () => handleManualKeyDown(key)),
      M.exhaustive,
    ) as Message

  const tabButtons = Array.map(tabs, (tab, index) => {
    const isActive = index === model.activeIndex
    const isFocused = index === focusedIndex
    const isTabDisabledAtIndex = isDisabled(index)
    const tabConfig = tabToConfig(tab, { isActive })

    return keyed(tabElement)(
      tabId(id, index),
      [
        Class(tabConfig.buttonClassName),
        Id(tabId(id, index)),
        Role('tab'),
        Type('button'),
        AriaSelected(isActive),
        AriaControls(tabPanelId(id, index)),
        Tabindex(isFocused ? 0 : -1),
        ...(isActive ? [DataAttribute('selected', '')] : []),
        ...(isTabDisabledAtIndex
          ? [Disabled(true), AriaDisabled(true), DataAttribute('disabled', '')]
          : [OnClick(toMessage(TabSelected.make({ index })))]),
        OnKeyDown(handleKeyDown),
      ],
      [tabConfig.buttonContent],
    )
  })

  const allPanels = Array.map(tabs, (tab, index) => {
    const isActive = index === model.activeIndex
    const panelConfig = tabToConfig(tab, { isActive })

    return keyed(panelElement)(
      tabPanelId(id, index),
      [
        Class(panelConfig.panelClassName),
        Id(tabPanelId(id, index)),
        Role('tabpanel'),
        AriaLabelledBy(tabId(id, index)),
        Tabindex(isActive ? 0 : -1),
        Hidden(!isActive),
        ...(isActive ? [DataAttribute('selected', '')] : []),
      ],
      [panelConfig.panelContent],
    )
  })

  const activePanelOnly = pipe(
    tabs,
    Array.get(model.activeIndex),
    Option.match({
      onNone: () => empty,
      onSome: (tab) => {
        const activeConfig = tabToConfig(tab, { isActive: true })

        return keyed(panelElement)(
          tabPanelId(id, model.activeIndex),
          [
            Class(activeConfig.panelClassName),
            Id(tabPanelId(id, model.activeIndex)),
            Role('tabpanel'),
            AriaLabelledBy(tabId(id, model.activeIndex)),
            Tabindex(0),
            DataAttribute('selected', ''),
          ],
          [activeConfig.panelContent],
        )
      },
    }),
  )

  const tabPanels = persistPanels ? allPanels : [activePanelOnly]

  const tabListAttributes = [
    Role('tablist'),
    AriaOrientation(String.toLowerCase(orientation)),
    ...(tabListClassName ? [Class(tabListClassName)] : []),
  ]

  const wrapperAttributes = className ? [Class(className)] : []

  return div(wrapperAttributes, [
    keyed(tabListElement)(`${id}-tablist`, tabListAttributes, tabButtons),
    ...tabPanels,
  ])
}
