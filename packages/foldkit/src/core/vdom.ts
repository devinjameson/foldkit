import { classModule, eventListenersModule, h, init, propsModule, styleModule } from 'snabbdom'
import type { VNode } from 'snabbdom'

export type { VNode } from 'snabbdom'

export const patch = init([classModule, propsModule, styleModule, eventListenersModule])

export const htmlElementToVNode = (element: HTMLElement): VNode => {
  const tagName = element.tagName.toLowerCase()

  const data: any = {}

  if (element.className) {
    data.class = element.className
  }

  if (element.id) {
    data.props = { id: element.id }
  }

  const children: (VNode | string)[] = []

  for (const child of element.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent
      if (text && text.trim()) {
        children.push(text)
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      children.push(htmlElementToVNode(child as HTMLElement))
    }
  }

  return h(tagName, data, children)
}
