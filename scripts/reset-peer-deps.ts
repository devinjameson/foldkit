import { readFileSync, writeFileSync } from 'node:fs'

// NOTE: Foldkit peers with real minimums are deliberately absent. Broadening
// one here would let a package install with a Foldkit release that does not
// export an API its built code imports. Those peers use plain semver ranges, so
// `changeset version` leaves them alone. `check-peer-floors.ts` checks every
// floor survives into the packed manifest.
const TARGETS = [
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
