import { Array, Option, pipe } from 'effect'

// Path reading for `domain/` modules. The segment arithmetic is shared with
// the page module reading in `pageModule.ts` through `modulePath.ts`; what
// stays here is the part specific to the domain container.

import {
  BARREL_NAME,
  isRelative,
  outermostContainerIndex,
  resolveRelative,
  sameOrWithinSegments,
  sameSegments,
  toSegments,
} from './modulePath.ts'

const DOMAIN_DIRECTORY_NAME = 'domain'

const PAGE_DIRECTORY_NAME = 'page'

/**
 * A file inside a domain module directory, such as `src/domain/cart.ts`.
 *
 * `containerSegments` end at the outermost `domain` directory, and
 * `appRootSegments` name the directory that holds it, which is where the app
 * level role modules sit.
 *
 * Unlike a page module, a file sitting directly in the container counts. A
 * domain module is usually a single file, so `domain/cart.ts` is the common
 * case rather than the ambiguous one.
 */
export interface DomainModule {
  readonly appRootSegments: ReadonlyArray<string>
  readonly containerSegments: ReadonlyArray<string>
  readonly directorySegments: ReadonlyArray<string>
}

const outermostDomainIndex = (
  segments: ReadonlyArray<string>,
): Option.Option<number> =>
  outermostContainerIndex(segments, DOMAIN_DIRECTORY_NAME)

/**
 * Read the domain module a file belongs to from its path alone.
 */
export const domainModuleOf = (
  filename: string,
): Option.Option<DomainModule> => {
  const segments = toSegments(filename)
  return pipe(
    outermostDomainIndex(segments),
    Option.map(domainIndex => ({
      appRootSegments: segments.slice(0, domainIndex),
      containerSegments: segments.slice(0, domainIndex + 1),
      directorySegments: segments.slice(0, -1),
    })),
  )
}

const commonPrefixLength = (
  segments: ReadonlyArray<string>,
  other: ReadonlyArray<string>,
): number => {
  const shared = Math.min(segments.length, other.length)
  let index = 0
  while (index < shared && segments[index] === other[index]) {
    index = index + 1
  }
  return index
}

/**
 * The app level role modules a domain module must not reach for.
 *
 * These are the parts of an application the runtime is assembled from, so an
 * import of any of them turns the bottom layer into a dependent of the top.
 */
const APP_ROLES: ReadonlyArray<string> = [
  'update',
  'view',
  'main',
  'message',
  'command',
  'subscription',
]

/**
 * What an upward import out of a domain module reached for.
 *
 * `page` names the page container itself, since which page was entered adds
 * nothing to the diagnostic. A `role` names the app level module by role.
 */
export type UpwardImportTarget =
  | Readonly<{ kind: 'page' }>
  | Readonly<{ kind: 'role'; role: string }>

/**
 * True when a relative import leaves the domain module's own container and
 * descends into a page container it does not already sit inside.
 *
 * The comparison starts at the point the resolved path diverges from the
 * importing file's own directory, so a `domain/` folder nested inside a page
 * is not reported for reaching around within that page. Whether that is
 * allowed is a question about page modules, and `no-cross-page-imports`
 * already owns it.
 */
const entersPageContainer = (
  domain: DomainModule,
  resolved: ReadonlyArray<string>,
): boolean => {
  const shared = commonPrefixLength(resolved, domain.directorySegments)
  return pipe(
    resolved,
    Array.findFirstIndex(
      (segment, index) => segment === PAGE_DIRECTORY_NAME && index >= shared,
    ),
    Option.isSome,
  )
}

/**
 * Resolve a relative import against an app level role module, matching the
 * module itself in either its file or its barrel form.
 *
 * A file inside a role directory, such as `view/icon`, is a shared module
 * rather than the role itself, and role names are ordinary enough words that
 * matching them anywhere in a tree would catch unrelated files. Anchoring on
 * the directory that holds `domain/` keeps the match to the modules the app
 * is actually assembled from.
 */
const appRoleTarget = (
  domain: DomainModule,
  resolved: ReadonlyArray<string>,
): Option.Option<string> =>
  pipe(
    APP_ROLES,
    Array.findFirst(
      role =>
        sameSegments(resolved, [...domain.appRootSegments, role]) ||
        sameSegments(resolved, [...domain.appRootSegments, role, BARREL_NAME]),
    ),
  )

/**
 * Resolve a relative import to the upward target it lands on, when it has one.
 *
 * Imports that stay inside the domain container are never upward, and neither
 * are bare package specifiers, which name a dependency rather than a place in
 * this application.
 */
export const upwardImportTarget = (
  domain: DomainModule,
  specifier: string,
): Option.Option<UpwardImportTarget> => {
  if (!isRelative(specifier)) {
    return Option.none()
  }
  const resolved = resolveRelative(domain.directorySegments, specifier)
  if (sameOrWithinSegments(resolved, domain.containerSegments)) {
    return Option.none()
  }
  if (entersPageContainer(domain, resolved)) {
    return Option.some({ kind: 'page' })
  }
  return pipe(
    appRoleTarget(domain, resolved),
    Option.map(role => ({ kind: 'role', role }) as const),
  )
}
