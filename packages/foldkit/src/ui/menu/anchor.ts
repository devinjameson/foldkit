import {
  autoUpdate,
  computePosition,
  flip,
  offset as floatingOffset,
  shift,
  size,
} from '@floating-ui/dom'
import type { Placement } from '@floating-ui/dom'

/** Static configuration for anchor-based positioning of menu items relative to the button. */
export type AnchorConfig = Readonly<{
  placement?: Placement
  gap?: number
  offset?: number
  padding?: number
  portal?: boolean
}>

const PORTAL_ROOT_ID = 'foldkit-portal-root'

const getOrCreatePortalRoot = (): HTMLElement => {
  const existing = document.getElementById(PORTAL_ROOT_ID)

  if (existing) {
    return existing
  }

  const root = document.createElement('div')
  root.id = PORTAL_ROOT_ID

  return document.body.appendChild(root)
}

const anchorCleanups = new WeakMap<Element, () => void>()

/** Returns insert/destroy hook callbacks that position the menu items container relative to its button using Floating UI. */
export const anchorHooks = (config: {
  buttonId: string
  anchor: AnchorConfig
}): Readonly<{
  onInsert: (items: Element) => void
  onDestroy: (items: Element) => void
}> => ({
  onInsert: (items: Element) => {
    const button = document.getElementById(config.buttonId)

    if (!(button instanceof HTMLElement) || !(items instanceof HTMLElement)) {
      return
    }

    const isPortal = config.anchor.portal ?? true

    if (isPortal) {
      getOrCreatePortalRoot().appendChild(items)
    }

    const { placement, gap, offset: crossAxis, padding } = config.anchor

    let isFirstUpdate = true

    const floatingCleanup = autoUpdate(button, items, () => {
      computePosition(button, items, {
        placement: placement ?? 'bottom-start',
        strategy: 'absolute',
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
          items.style.visibility = ''
        }
      })
    })

    if (isPortal) {
      const handleTabKey = (event: Event): void => {
        if (event instanceof KeyboardEvent && event.key === 'Tab') {
          button.focus()
        }
      }

      items.addEventListener('keydown', handleTabKey)

      anchorCleanups.set(items, () => {
        floatingCleanup()
        items.removeEventListener('keydown', handleTabKey)
      })
    } else {
      anchorCleanups.set(items, floatingCleanup)
    }
  },
  onDestroy: (items: Element) => {
    anchorCleanups.get(items)?.()
    anchorCleanups.delete(items)
  },
})
