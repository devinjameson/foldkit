import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'

// NOTE: one nonempty id must reach every step in this build.
const supplied = process.env.FOLDKIT_BUILD_ID
const buildId =
  supplied === undefined || supplied === '' ? randomUUID() : supplied

// NOTE: a bare `vite`/`tsx` spawn finds node_modules/.bin because the package
// manager that launched this script put it on PATH. `deno task` does not, so
// under Deno the shim is named by path instead. Naming the shim is what keeps
// the build on the vite in package.json: `npm:vite` would resolve to whatever
// the registry calls latest, and a build running vite 9 while the dev server
// and vitest stay on vite 8 fails in ways neither one reproduces. The prerender
// script runs directly under `deno run`, since Deno executes TypeScript
// natively and needs no separate `tsx`.
const isDeno = typeof Deno !== 'undefined'

const toViteCommand = args =>
  isDeno
    ? ['deno', ['run', '-A', 'node_modules/.bin/vite', ...args]]
    : ['vite', args]

const prerenderCommand = isDeno
  ? ['deno', ['run', '-A', 'scripts/prerender.ts']]
  : ['tsx', ['scripts/prerender.ts']]

const steps = [
  toViteCommand(['build', '--outDir', 'dist/client']),
  toViteCommand([
    'build',
    '--ssr',
    'src/entry.server.ts',
    '--outDir',
    'dist/server',
  ]),
  prerenderCommand,
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
