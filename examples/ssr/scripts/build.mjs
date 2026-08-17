import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'

// NOTE: one id names this build, and every command below is given that same
// id, so the client bundle and the server bundle of a deployment agree on which
// deployment they are. `renderToString` stamps it on the rendered root and
// `Runtime.hydrate` compares it before adopting any DOM, so a page left over
// from an earlier deployment is refused and contained rather than reconciled
// against a client that no longer means the same thing by it.
//
// The id is published in the HTML every visitor receives. It identifies a
// deployment and is never a credential, so keep secrets out of it. Set
// FOLDKIT_BUILD_ID to name builds from a value the deployment already has, such
// as a commit or a release tag; without one, each build takes a fresh id.
// NOTE: `??` alone would take an empty FOLDKIT_BUILD_ID as a real value, and
// the plugin treats empty as absent, so the build would compile no id at all and
// fail later at the render. Empty is unset here too.
const supplied = process.env.FOLDKIT_BUILD_ID
const buildId =
  supplied === undefined || supplied === '' ? randomUUID() : supplied

const steps = [
  ['vite', ['build', '--outDir', 'dist/client']],
  ['vite', ['build', '--ssr', 'server/main.ts', '--outDir', 'dist/server']],
]

for (const [command, args] of steps) {
  const { status } = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, FOLDKIT_BUILD_ID: buildId },
  })
  if (status !== 0) {
    process.exit(status ?? 1)
  }
}
