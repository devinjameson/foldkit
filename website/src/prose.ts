import { Array } from 'effect'
import {
  Class,
  Href,
  Html,
  Id,
  a,
  div,
  h1,
  h2,
  h3,
  li,
  p,
  strong,
  ul,
} from 'foldkit/html'

export const link = (href: string, text: string): Html =>
  a([Href(href), Class('text-blue-500 hover:underline')], [text])

export const heading = (
  level: 1 | 2 | 3,
  id: string,
  text: string,
): Html => {
  const classes = {
    1: 'text-2xl md:text-4xl font-bold text-gray-900 mb-6',
    2: 'text-xl md:text-2xl font-semibold text-gray-900 mb-4 mt-12',
    3: 'text-lg font-semibold text-gray-900 mb-3 mt-8',
  }
  const tag = { 1: h1, 2: h2, 3: h3 }
  return tag[level]([Class(classes[level]), Id(id)], [text])
}

export const para = (...content: Array<string | Html>): Html =>
  p([Class('mb-4')], content)

export const paragraphs = (...contents: string[]): Html[] =>
  Array.map(contents, (text) => p([Class('mb-4')], [text]))

export const section = (
  id: string,
  title: string,
  content: Html[],
): Html => div([], [heading(2, id, title), ...content])

export const subsection = (
  id: string,
  title: string,
  content: Html[],
): Html => div([], [heading(3, id, title), ...content])

export const bullets = (...items: Array<string | Html>): Html =>
  ul(
    [Class('list-disc mb-8 space-y-2 ml-4')],
    items.map((item) => li([], [item])),
  )

export const bulletPoint = (label: string, description: string): Html =>
  li([], [strong([], [`${label}:`]), ` ${description}`])
