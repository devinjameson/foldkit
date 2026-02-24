import {
  autoUpdate,
  computePosition,
  flip,
  offset as floatingOffset,
  shift,
  size,
} from '@floating-ui/dom'
import type { Placement } from '@floating-ui/dom'
import { Effect, Schema as S, Stream } from 'effect'

import type { Command } from '../../command'

/** Static configuration for anchor-based positioning of menu items relative to the button. */
export type AnchorConfig = Readonly<{
  placement?: Placement
  gap?: number
  offset?: number
  padding?: number
}>

/** Schema for the subscription dependency that controls anchor stream activation. */
export const AnchorDeps = S.Struct({
  isVisible: S.Boolean,
})

/** Creates a subscription stream factory that positions the menu items container relative to its button using the Popover API and Floating UI. */
export const makeAnchorStream =
  (config: {
    menuId: string
    anchor: AnchorConfig
  }): ((deps: typeof AnchorDeps.Type) => Stream.Stream<Command<never>>) =>
  ({ isVisible }) =>
    Stream.when(
      Stream.async<Command<never>>(_emit => {
        const button = document.querySelector(`#${config.menuId}-button`)
        const items = document.querySelector(`#${config.menuId}-items`)

        if (
          !(button instanceof HTMLElement) ||
          !(items instanceof HTMLElement)
        ) {
          return Effect.void
        }

        const { placement, gap, offset: crossAxis, padding } = config.anchor

        let isFirstUpdate = true

        const cleanupAutoUpdate = autoUpdate(button, items, () => {
          computePosition(button, items, {
            placement: placement ?? 'bottom-start',
            strategy: 'fixed',
            middleware: [
              floatingOffset({
                mainAxis: gap ?? 0,
                crossAxis: crossAxis ?? 0,
              }),
              flip({ padding: padding ?? 0 }),
              shift({ padding: padding ?? 0 }),
              size({
                apply({ rects }) {
                  items.style.setProperty(
                    '--button-width',
                    `${rects.reference.width}px`,
                  )
                },
              }),
            ],
          }).then(({ x, y }) => {
            items.style.left = `${x}px`
            items.style.top = `${y}px`

            if (isFirstUpdate) {
              isFirstUpdate = false
              items.showPopover()
            }
          })
        })

        return Effect.sync(() => {
          cleanupAutoUpdate()
          if (items.isConnected) {
            items.hidePopover()
          }
        })
      }),
      () => isVisible,
    )
