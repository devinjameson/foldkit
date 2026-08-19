import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'

// NOTE: one nonempty id must reach every step in this build.
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
