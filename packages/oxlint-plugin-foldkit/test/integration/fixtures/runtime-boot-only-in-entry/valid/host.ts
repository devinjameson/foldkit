import { Runtime } from 'foldkit'

import { makeElement } from './widget'

// A host page embeds the widget. The embed sits inside an exported function,
// so importing this module starts nothing: the caller decides when to mount.

export const startWidget = (container: HTMLElement): (() => void) => {
  const element = makeElement(container, { initialCount: 10 })
  const handle = Runtime.embed(element)

  return () => {
    handle.dispose()
  }
}
