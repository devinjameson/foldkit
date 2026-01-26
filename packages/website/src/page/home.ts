import { Html } from 'foldkit/html'

import { div } from '../html'
import { Link } from '../link'
import {
  bulletPoint,
  bullets,
  callout,
  heading,
  link,
  para,
} from '../prose'

export const view = (): Html =>
  div(
    [],
    [
      heading('h1', 'introduction', 'Introduction'),
      para(
        'Foldkit is a TypeScript framework for building type-safe, functional web applications (',
        link(Link.websiteSource, 'like this one!'),
        '). It uses ',
        link(Link.theElmArchitecture, 'The Elm Architecture'),
        ' and is built with ',
        link(Link.effect, 'Effect'),
        '.',
      ),
      para(
        "If you're coming from a framework like ",
        link(Link.react, 'React'),
        ', ',
        link(Link.vue, 'Vue'),
        ', ',
        link(Link.angular, 'Angular'),
        ', ',
        link(Link.svelte, 'Svelte'),
        ', or ',
        link(Link.solid, 'Solid'),
        ', Foldkit may feel unfamiliar at first. However, once you get used to its patterns and principles, you may find it to be a refreshing and enjoyable way to build web applications.',
      ),
      callout(
        'Coming from React?',
        'Read our ',
        link(
          '/coming-from-react',
          'dedicated guide for React developers',
        ),
        ' to understand the key differences and how your existing knowledge translates.',
      ),
      para(
        'The main qualities of Foldkit that differentiate it from other frameworks are:',
      ),
      bullets(
        bulletPoint(
          'The Elm Architecture',
          'Foldkit uses the proven Model-View-Update pattern in The Elm Architecture, providing a clear unidirectional data flow that makes applications predictable and easy to reason about.',
        ),
        bulletPoint(
          'Single slice of state',
          'The entire application state is stored in a single immutable model, making it easier to reason about and manage state changes.',
        ),
        bulletPoint(
          'Controlled side effects',
          'Side effects are managed explicitly through commands, allowing for better control and testing of asynchronous operations. This quality in particular makes Foldkit applications exceptionally clear.',
        ),
        bulletPoint(
          'Functional',
          'Foldkit unapologetically embraces a functional style of programming, promoting immutability, pure functions, and declarative code.',
        ),
        bulletPoint(
          'Built with and for Effect',
          'Foldkit leverages the power of the Effect library to provide a robust and type-safe foundation for building applications.',
        ),
      ),
    ],
  )
