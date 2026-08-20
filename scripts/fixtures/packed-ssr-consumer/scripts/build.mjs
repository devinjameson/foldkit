import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'

const buildId = process.env.FOLDKIT_BUILD_ID ?? randomUUID()
const outRoot = process.argv[2]
const base = process.argv[3]

const steps = [
  [
    'vite',
    ['build', '--base', base, '--outDir', outRoot + '/client', '--emptyOutDir'],
  ],
  [
    'vite',
    [
      'build',
      '--ssr',
      'src/entry.server.ts',
      '--outDir',
      outRoot + '/server',
      '--emptyOutDir',
    ],
  ],
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
