import { Array, Option, String, pipe } from 'effect'

const SEPARATOR = '/'

const PAGE_DIRECTORY_NAME = 'page'

const BARREL_NAME = 'index'

const toSegments = (filePath: string): ReadonlyArray<string> =>
  pipe(
    filePath.replaceAll('\\', SEPARATOR).split(SEPARATOR),
    Array.filter(segment => !String.isEmpty(segment)),
  )

/**
 * A file inside a page module directory, such as `src/page/cart/view.ts`.
 *
 * `containerSegments` end at the outermost `page` directory, and `name` is the
 * directory directly beneath it. Files sitting directly in `page`, such as
 * `page/index.ts` or a single file page like `page/cart.ts`, produce no
 * `PageModule`, because nothing distinguishes a one file page from a helper
 * that happens to live beside the pages.
 */
export interface PageModule {
  readonly containerSegments: ReadonlyArray<string>
  readonly directorySegments: ReadonlyArray<string>
  readonly name: string
}

const outermostPageIndex = (
  segments: ReadonlyArray<string>,
): Option.Option<number> =>
  pipe(
    segments,
    Array.findFirstIndex(
      (segment, index) =>
        segment === PAGE_DIRECTORY_NAME && index < segments.length - 1,
    ),
  )

/**
 * Read the page module a file belongs to from its path alone.
 */
export const pageModuleOf = (filename: string): Option.Option<PageModule> => {
  const segments = toSegments(filename)
  return pipe(
    outermostPageIndex(segments),
    Option.flatMap(pageIndex => {
      const beneathContainer = segments.slice(pageIndex + 1)
      return beneathContainer.length < 2
        ? Option.none()
        : Option.some({
            containerSegments: segments.slice(0, pageIndex + 1),
            directorySegments: segments.slice(0, -1),
            name: beneathContainer[0] as string,
          })
    }),
  )
}

/**
 * A file anywhere inside a page container, paired with the app root the
 * container sits in.
 *
 * Unlike `pageModuleOf` this accepts a file sitting directly in the container,
 * such as a single file page, because what it answers does not depend on
 * telling a page apart from a helper.
 */
export interface PageFile {
  readonly appRootSegments: ReadonlyArray<string>
  readonly directorySegments: ReadonlyArray<string>
}

/**
 * Read the app root a page file belongs to from its path alone.
 */
export const pageFileOf = (filename: string): Option.Option<PageFile> => {
  const segments = toSegments(filename)
  return pipe(
    outermostPageIndex(segments),
    Option.map(pageIndex => ({
      appRootSegments: segments.slice(0, pageIndex),
      directorySegments: segments.slice(0, -1),
    })),
  )
}

const isRelative = (specifier: string): boolean =>
  specifier.startsWith('./') || specifier.startsWith('../')

const resolveRelative = (
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

const startsWithSegments = (
  segments: ReadonlyArray<string>,
  prefix: ReadonlyArray<string>,
): boolean =>
  segments.length > prefix.length &&
  prefix.every((segment, index) => segments[index] === segment)

/**
 * Resolve a relative import to the page module it lands in, when that module
 * is a different one from `page`.
 *
 * An import that resolves to a single name directly under the page container
 * is reported only for the `index` barrel, which always re-exports every page.
 * Any other single name is ambiguous from the path alone, since a page
 * container holds both single file pages and shared helpers.
 */
export const crossPageImportTarget = (
  page: PageModule,
  specifier: string,
): Option.Option<string> => {
  if (!isRelative(specifier)) {
    return Option.none()
  }
  const resolved = resolveRelative(page.directorySegments, specifier)
  if (!startsWithSegments(resolved, page.containerSegments)) {
    return Option.none()
  }
  const beneathContainer = resolved.slice(page.containerSegments.length)
  const [target] = beneathContainer
  if (target === undefined || target === page.name) {
    return Option.none()
  }
  return beneathContainer.length > 1 || target === BARREL_NAME
    ? Option.some(target)
    : Option.none()
}

const APP_COMPOSITION_ROLES: ReadonlyArray<string> = ['update', 'view']

const sameSegments = (
  segments: ReadonlyArray<string>,
  other: ReadonlyArray<string>,
): boolean =>
  segments.length === other.length &&
  segments.every((segment, index) => other[index] === segment)

/**
 * Resolve a relative import to the app level role module it lands in, when
 * that module is one the app composes its pages with.
 *
 * The match is the role module itself, `update` or `view`, in either its file
 * or its barrel form. A file inside a role directory, such as `view/icon`, is
 * a shared module rather than the composition root, so it is left alone.
 */
export const appCompositionImportTarget = (
  pageFile: PageFile,
  specifier: string,
): Option.Option<string> => {
  if (!isRelative(specifier)) {
    return Option.none()
  }
  const resolved = resolveRelative(pageFile.directorySegments, specifier)
  return pipe(
    APP_COMPOSITION_ROLES,
    Array.findFirst(
      role =>
        sameSegments(resolved, [...pageFile.appRootSegments, role]) ||
        sameSegments(resolved, [
          ...pageFile.appRootSegments,
          role,
          BARREL_NAME,
        ]),
    ),
  )
}
