import { Array, Option, Record, Schema as S } from 'effect'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import type { Plugin } from 'vite'

const DEV_TOOLS_PACKAGE_NAME = '@foldkit/devtools'
const FOLDKIT_PACKAGE_NAME = 'foldkit'
const DEV_TOOLS_VITE_EXPORT = './vite'
const DEV_TOOLS_OVERLAY_MODULE_ID = 'virtual:foldkit-devtools-overlay'
const RESOLVED_DEV_TOOLS_OVERLAY_MODULE_ID = `\0${DEV_TOOLS_OVERLAY_MODULE_ID}`
const DEV_TOOLS_VITE_IMPORT_SPECIFIER = `${DEV_TOOLS_PACKAGE_NAME}${DEV_TOOLS_VITE_EXPORT.slice(1)}`
const DEV_TOOLS_HOST_IMPORT_SPECIFIER = 'foldkit/devtools-host'
// NOTE: declared to the dep optimizer in the plugin's `config` hook, each
// specifier on the standing of the package that owns it. The optimizer's scan
// crawls imports reachable from source, and these two appear only in the
// virtual module below, so without the declaration a cold cache discovers
// them on the first page load and re-optimizes mid-session. The full-page
// reload that follows tears down whatever the page was running, which under a
// browser-mode test runner is the suite itself.
const DEV_TOOLS_OVERLAY_IMPORTS: ReadonlyArray<{
  specifier: string
  packageName: string
}> = [
  {
    specifier: DEV_TOOLS_VITE_IMPORT_SPECIFIER,
    packageName: DEV_TOOLS_PACKAGE_NAME,
  },
  {
    specifier: DEV_TOOLS_HOST_IMPORT_SPECIFIER,
    packageName: FOLDKIT_PACKAGE_NAME,
  },
]
const DEV_TOOLS_OVERLAY_MODULE_SOURCE = `
import { overlay } from '${DEV_TOOLS_VITE_IMPORT_SPECIFIER}'
import { __setDevToolsOverlay } from '${DEV_TOOLS_HOST_IMPORT_SPECIFIER}'

__setDevToolsOverlay(overlay)
`

const ApplicationPackageJson = S.Struct({
  dependencies: S.optional(S.Record(S.String, S.String)),
})

const DevToolsPackageJson = S.Struct({
  exports: S.optional(S.Record(S.String, S.Unknown)),
})

const decodeApplicationPackageJson = S.decodeUnknownSync(ApplicationPackageJson)
const decodeDevToolsPackageJson = S.decodeUnknownSync(DevToolsPackageJson)

const readPackageJson = <A>(
  decode: (raw: unknown) => A,
  packageJsonPath: string,
): Option.Option<A> => {
  try {
    return Option.some(
      decode(JSON.parse(readFileSync(packageJsonPath, 'utf8'))),
    )
  } catch {
    return Option.none()
  }
}

const findDirectoryUpward = (
  directory: string,
  isMatch: (directory: string) => boolean,
): Option.Option<string> => {
  if (isMatch(directory)) {
    return Option.some(directory)
  } else {
    const parent = dirname(directory)
    if (parent === directory) {
      return Option.none()
    } else {
      return findDirectoryUpward(parent, isMatch)
    }
  }
}

// NOTE: `require.resolve` is not usable here. `@foldkit/devtools` is ESM-only
// and declares no `require` condition, so resolution throws even when the
// package is installed, and `resolve.paths` appends this module's own lookup
// chain, which under pnpm includes the hoisted virtual store. Both would make
// the answer depend on something other than what the application installed.
const installedPackageJsonPath = (
  directory: string,
  packageName: string,
): string => join(directory, 'node_modules', packageName, 'package.json')

const findInstalledPackageJsonPath = (
  root: string,
  packageName: string,
): Option.Option<string> =>
  findDirectoryUpward(resolve(root), directory =>
    existsSync(installedPackageJsonPath(directory, packageName)),
  ).pipe(
    Option.map(directory => installedPackageJsonPath(directory, packageName)),
  )

const findDevToolsPackageJsonPath = (root: string): Option.Option<string> =>
  findInstalledPackageJsonPath(root, DEV_TOOLS_PACKAGE_NAME)

// NOTE: the virtual module imports `@foldkit/devtools/vite` statically, so an
// installed copy that predates that export point would fail the build rather
// than quietly skip the overlay. Injecting only when the export exists lets
// the two packages be upgraded in either order.
const hasDevToolsViteExport = (root: string): boolean =>
  findDevToolsPackageJsonPath(root).pipe(
    Option.flatMap(packageJsonPath =>
      readPackageJson(decodeDevToolsPackageJson, packageJsonPath),
    ),
    Option.flatMapNullishOr(packageJson => packageJson.exports),
    Option.exists(Record.has(DEV_TOOLS_VITE_EXPORT)),
  )

// NOTE: Vite's `root` is where `index.html` lives, which is not always the
// package directory (an app may serve from a subdirectory). Walking up to the
// nearest manifest keeps dependency placement meaningful for those layouts.
const applicationPackageJsonPath = (directory: string): string =>
  join(directory, 'package.json')

const findApplicationPackageJsonPath = (root: string): Option.Option<string> =>
  findDirectoryUpward(resolve(root), directory =>
    existsSync(applicationPackageJsonPath(directory)),
  ).pipe(Option.map(applicationPackageJsonPath))

// NOTE: mirrors the dep optimizer's own rule that a linked package is served
// from source rather than pre-bundled. A package installed from the registry
// realpaths into some `node_modules` directory, a store included, while a
// workspace link realpaths out to its source checkout. Force-including a
// specifier owned by a linked package would freeze that source into the
// optimizer's cache, where edits to it no longer reach the page. Asked per
// package, because the two overlay imports have different owners and a layout
// can link one while installing the other.
const isPackageResolvedIntoNodeModules = (
  root: string,
  packageName: string,
): boolean =>
  findInstalledPackageJsonPath(root, packageName).pipe(
    Option.flatMap(packageJsonPath => {
      try {
        return Option.some(realpathSync(dirname(packageJsonPath)))
      } catch {
        return Option.none()
      }
    }),
    Option.exists(packageDirectory =>
      packageDirectory.split(sep).includes('node_modules'),
    ),
  )

const isDevToolsProductionDependency = (root: string): boolean =>
  findApplicationPackageJsonPath(root).pipe(
    Option.flatMap(packageJsonPath =>
      readPackageJson(decodeApplicationPackageJson, packageJsonPath),
    ),
    Option.flatMapNullishOr(packageJson => packageJson.dependencies),
    Option.exists(Record.has(DEV_TOOLS_PACKAGE_NAME)),
  )

/**
 * Determines whether the Vite integration should include the DevTools overlay.
 * Development serves it whenever the package is installed. Production builds
 * additionally require it in regular `dependencies`, which is the opt-in that
 * keeps a development dependency out of the shipped bundle.
 */
export const shouldInjectDevToolsOverlay = (
  command: 'serve' | 'build',
  root: string,
): boolean => {
  if (!hasDevToolsViteExport(root)) {
    return false
  } else if (command === 'serve') {
    return true
  } else {
    return isDevToolsProductionDependency(root)
  }
}

/** Creates the Vite plugin that registers the appropriate DevTools overlay. */
export const devToolsOverlayPlugin = (): Plugin => {
  let isInjectionEnabled = false

  return {
    name: 'foldkit:devtools-overlay',
    // NOTE: the optimizer only runs for the dev server, and the overlay's
    // imports resolve only when the injection check passes, so entries are
    // added under exactly the conditions where the served page will import
    // them. Declaring them unconditionally would log a "failed to resolve"
    // warning in every project without DevTools installed. Each specifier then
    // stands or falls with its own package: one owned by a linked package, the
    // workspace's own examples included, stays undeclared and keeps being
    // served from source, whatever the other one does.
    config: (userConfig, environment) => {
      const root = userConfig.root ?? process.cwd()
      if (
        environment.command !== 'serve' ||
        !shouldInjectDevToolsOverlay(environment.command, root)
      ) {
        return undefined
      }

      const include = DEV_TOOLS_OVERLAY_IMPORTS.filter(({ packageName }) =>
        isPackageResolvedIntoNodeModules(root, packageName),
      ).map(({ specifier }) => specifier)

      if (Array.isArrayEmpty(include)) {
        return undefined
      } else {
        return { optimizeDeps: { include } }
      }
    },
    configResolved: config => {
      isInjectionEnabled = shouldInjectDevToolsOverlay(
        config.command,
        config.root,
      )
    },
    resolveId: id => {
      if (id === DEV_TOOLS_OVERLAY_MODULE_ID) {
        return RESOLVED_DEV_TOOLS_OVERLAY_MODULE_ID
      } else {
        return undefined
      }
    },
    load: id => {
      if (id === RESOLVED_DEV_TOOLS_OVERLAY_MODULE_ID) {
        return DEV_TOOLS_OVERLAY_MODULE_SOURCE
      } else {
        return undefined
      }
    },
    transformIndexHtml: {
      order: 'pre',
      handler: () => {
        if (!isInjectionEnabled) {
          return
        }

        return [
          {
            tag: 'script',
            attrs: {
              type: 'module',
            },
            children: `import '${DEV_TOOLS_OVERLAY_MODULE_ID}'`,
            injectTo: 'head-prepend',
          },
        ]
      },
    },
  }
}
