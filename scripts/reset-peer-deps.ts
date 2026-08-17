import { readFileSync, writeFileSync } from 'node:fs'

// NOTE: `@foldkit/vite-plugin` is deliberately absent. Its `foldkit` peer
// declares a real minimum, the first release that ships the server export the
// plugin imports, so broadening it here would republish the compatibility bug
// that floor exists to prevent: a plugin that accepts a foldkit without the
// export and fails at import. That peer is a plain semver range rather than
// the `workspace:` protocol, so `changeset version` leaves it alone and there
// is nothing to restore. `assert-packed-manifests.ts` checks the floor
// survives into the packed manifest.
const TARGETS = [
  { path: 'packages/devtools-mcp/package.json', dep: 'foldkit' },
  { path: 'packages/ui/package.json', dep: 'foldkit' },
  { path: 'packages/devtools/package.json', dep: 'foldkit' },
  { path: 'packages/devtools/package.json', dep: '@foldkit/ui' },
] as const

const BROAD_RANGE = 'workspace:^0'

for (const target of TARGETS) {
  const raw = readFileSync(target.path, 'utf8')
  const pkg = JSON.parse(raw) as {
    peerDependencies?: Record<string, string>
  }

  const current = pkg.peerDependencies?.[target.dep]
  if (current === undefined) {
    continue
  }
  if (current === BROAD_RANGE) {
    continue
  }

  pkg.peerDependencies![target.dep] = BROAD_RANGE
  writeFileSync(target.path, JSON.stringify(pkg, null, 2) + '\n')
  console.log(
    `Reset ${target.dep} peer dep in ${target.path}: ${current} -> ${BROAD_RANGE}`,
  )
}
