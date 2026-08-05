import { Array, Option, String, pipe } from 'effect'

// Path arithmetic shared by the rules that reason about where a file sits in a
// project and where its relative imports land. Everything here is string work
// on POSIX segments: no filesystem access, and no resolution of extensions or
// package specifiers, since a lint rule sees one file and its text.

export const SEPARATOR = '/'

export const BARREL_NAME = 'index'

/** Split a path into segments, tolerating Windows separators. */
export const toSegments = (filePath: string): ReadonlyArray<string> =>
  pipe(
    filePath.replaceAll('\\', SEPARATOR).split(SEPARATOR),
    Array.filter(segment => !String.isEmpty(segment)),
  )

/** A specifier that names a place in this project rather than a dependency. */
export const isRelative = (specifier: string): boolean =>
  specifier.startsWith('./') || specifier.startsWith('../')

/**
 * Resolve a relative specifier against the directory of the importing file.
 *
 * The result keeps whatever the specifier wrote, so `./model` stays extension
 * free. Callers compare segments, never disk paths.
 */
export const resolveRelative = (
  fromDirectorySegments: ReadonlyArray<string>,
  specifier: string,
): ReadonlyArray<string> =>
  pipe(
    specifier.split(SEPARATOR),
    Array.reduce(fromDirectorySegments, (resolved, part) => {
      if (part === '' || part === '.') {
        return resolved
      }
      return part === '..'
        ? resolved.slice(0, -1)
        : Array.append(resolved, part)
    }),
  )

/** Whether `segments` sits strictly inside the directory `prefix` names. */
export const startsWithSegments = (
  segments: ReadonlyArray<string>,
  prefix: ReadonlyArray<string>,
): boolean =>
  segments.length > prefix.length &&
  prefix.every((segment, index) => segments[index] === segment)

/** Whether `segments` names `prefix` itself or something inside it. */
export const sameOrWithinSegments = (
  segments: ReadonlyArray<string>,
  prefix: ReadonlyArray<string>,
): boolean =>
  segments.length >= prefix.length &&
  prefix.every((segment, index) => segments[index] === segment)

/** Whether two segment lists name the same path. */
export const sameSegments = (
  segments: ReadonlyArray<string>,
  other: ReadonlyArray<string>,
): boolean =>
  segments.length === other.length &&
  segments.every((segment, index) => other[index] === segment)

/**
 * The index of the outermost segment with this name that still has something
 * beneath it.
 *
 * Outermost rather than nearest, so a container nested inside another of the
 * same name (`page/loggedIn/page/dashboard.ts`) is read against the top one.
 */
export const outermostContainerIndex = (
  segments: ReadonlyArray<string>,
  containerName: string,
): Option.Option<number> =>
  pipe(
    segments,
    Array.findFirstIndex(
      (segment, index) =>
        segment === containerName && index < segments.length - 1,
    ),
  )
