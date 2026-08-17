import type { Plugin } from 'vite'

// The build id names the deployment a page came from. The server stamps it on
// the rendered root, the client carries it, and hydration refuses a page whose
// id is not its own before it adopts any DOM.
//
// Per-view identities cannot answer that question. They move when the view they
// name changes, but what a view renders also depends on the constants it
// imports, the configuration it reads, the dependencies it calls, and the
// arguments its caller passes. A component whose own source is untouched renders
// something different when its caller changes, and its identity is the one that
// wins on the element, so a stale page's `<input name="email">` can otherwise be
// adopted for a new build's `<input name="ssn">`, carrying what a visitor typed
// into a field that submits under a different name.
//
// The id is supplied by the deployment rather than derived from the project.
// Deriving it was tried and does not hold: a digest of the files under the Vite
// root misses shared modules from elsewhere in a monorepo, untracked inputs, and
// environment-derived configuration, so two deployments that render differently
// can share an id; it moves when a build writes output the next build reads, so
// one deployment can produce two ids; and hashing whatever files happen to sit
// in the project turns a value published in HTML into an oracle for the secrets
// among them. A value the deployment already has (a commit, a release tag, a
// container digest) has none of those problems.
//
// This plugin only compiles the id into application code. Foldkit itself is an
// ordinary dependency that Vite externalizes from a server build, where a
// compile-time define never reaches it, so the id is handed to `renderToString`
// and `Runtime.hydrate` explicitly rather than read from inside the framework.

const BUILD_ID_ENVIRONMENT_VARIABLE = 'FOLDKIT_BUILD_ID'

/** The build id this build was given, from the plugin option or
 *  `FOLDKIT_BUILD_ID`, or `undefined` when the deployment supplied neither.
 *
 * @internal Exported for tests.
 */
export const resolveBuildId = (configured?: string): string | undefined => {
  if (configured !== undefined && configured !== '') {
    return configured
  }
  const fromEnvironment = process.env[BUILD_ID_ENVIRONMENT_VARIABLE]
  return fromEnvironment !== undefined && fromEnvironment !== ''
    ? fromEnvironment
    : undefined
}

/**
 * Compiles the deployment's build id into application code as
 * `import.meta.env.FOLDKIT_BUILD_ID`, for the client entry and the server entry
 * to hand to `Runtime.hydrate` and `renderToString`.
 *
 * Only builds carry an id. In development the server render and the client run
 * from one module graph in one process, so there is nothing to disagree about.
 */
export const foldkitBuildToken = (buildId?: string): Plugin => ({
  name: 'foldkit:build-token',
  apply: 'build',
  config: () => {
    const resolved = resolveBuildId(buildId)
    return resolved === undefined
      ? {}
      : {
          define: {
            'import.meta.env.FOLDKIT_BUILD_ID': JSON.stringify(resolved),
          },
        }
  },
})
