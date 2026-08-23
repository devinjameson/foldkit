import { randomUUID } from 'node:crypto'
import { defineConfig } from 'vite'

import { foldkit } from '@foldkit/vite-plugin'
import tailwindcss from '@tailwindcss/vite'

// NOTE: one id has to name this build, and a build that has none refuses to
// render a hydratable page. A deployment sets FOLDKIT_BUILD_ID to a value it
// already has, such as a commit or a release tag; a local build takes a fresh
// one rather than a constant, which would make a stale page look current.
// `??` alone would take an empty FOLDKIT_BUILD_ID as a real value, and the
// plugin treats empty as absent, so the build would compile no id at all.
const supplied = process.env['FOLDKIT_BUILD_ID']
const buildId =
  supplied === undefined || supplied === '' ? randomUUID() : supplied

export default defineConfig({
  plugins: [
    tailwindcss(),
    foldkit({
      buildId,
      ssr: {
        serverEntry: '/src/entry.server.ts',
        build: { prerender: true },
      },
    }),
  ],
})
