import { type Example } from './examples.js'

export const RENDERING_VALUES = ['spa', 'ssg', 'ssr'] as const

export type Rendering = (typeof RENDERING_VALUES)[number]

export const renderings: ReadonlyArray<{
  value: Rendering
  title: string
  description: string
}> = [
  {
    value: 'spa',
    title: 'SPA',
    description: 'Render entirely in the browser',
  },
  {
    value: 'ssg',
    title: 'SSG',
    description:
      'Prerender routes to static HTML at build time, then hydrate in the browser',
  },
  {
    value: 'ssr',
    title: 'SSR',
    description:
      'Render each request on a Node server, then hydrate in the browser',
  },
]

export type Scaffold =
  | Readonly<{ _tag: 'Spa'; example: Example }>
  | Readonly<{ _tag: 'Ssg' }>
  | Readonly<{ _tag: 'Ssr' }>

export const Spa = (example: Example): Scaffold => ({ _tag: 'Spa', example })
export const Ssg: Scaffold = { _tag: 'Ssg' }
export const Ssr: Scaffold = { _tag: 'Ssr' }
