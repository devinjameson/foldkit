import { spawn } from 'node:child_process'
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { examples } from '../packages/website/src/page/example/meta'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..')
const EXAMPLES_DIR = resolve(REPO_ROOT, 'examples')
const OUTPUT_DIR = resolve(
  REPO_ROOT,
  'packages/website/public/example-apps-embed',
)
const BRIDGE_SCRIPT_PATH = resolve(REPO_ROOT, 'scripts/example-bridge.js')
const BRIDGE_SCRIPT_TAG = '<script src="bridge.js"></script></head>'
const MAX_CONCURRENT_EXAMPLE_BUILDS = 4

const runExampleCommand = (
  exampleDir: string,
  slug: string,
  commandArguments: ReadonlyArray<string>,
): Promise<void> =>
  new Promise((resolvePromise, rejectPromise) => {
    const childProcess = spawn('pnpm', ['exec', ...commandArguments], {
      cwd: exampleDir,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    const writePrefixed = (chunk: Buffer): void => {
      for (const line of chunk.toString().split('\n')) {
        if (line !== '') {
          console.log(`[${slug}] ${line}`)
        }
      }
    }

    childProcess.stdout?.on('data', writePrefixed)
    childProcess.stderr?.on('data', writePrefixed)

    childProcess.once('error', rejectPromise)
    childProcess.once('close', exitCode => {
      if (exitCode === 0) {
        resolvePromise()
      } else {
        rejectPromise(new Error(`Example build failed: ${slug}`))
      }
    })
  })

const collectHtmlPaths = (directory: string): ReadonlyArray<string> =>
  readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const entryPath = join(directory, entry.name)
    if (entry.isDirectory()) {
      return collectHtmlPaths(entryPath)
    }
    return entry.name.endsWith('.html') ? [entryPath] : []
  })

const injectBridgeScript = (outputDir: string): void => {
  copyFileSync(BRIDGE_SCRIPT_PATH, resolve(outputDir, 'bridge.js'))

  for (const htmlPath of collectHtmlPaths(outputDir)) {
    const html = readFileSync(htmlPath, 'utf8')
    writeFileSync(htmlPath, html.replace('</head>', BRIDGE_SCRIPT_TAG))
  }
  console.log('  → injected bridge script')
}

const buildSpaExample = async (
  exampleDir: string,
  slug: string,
  outputDir: string,
): Promise<void> => {
  await runExampleCommand(exampleDir, slug, [
    'vite',
    'build',
    '--base',
    `/example-apps-embed/${slug}/`,
    '--outDir',
    outputDir,
  ])
}

// NOTE: a prerendered example's prerender script reads its template from
// dist/client and its compiled entry from dist/server, so the client build
// lands in the example's own dist first and the finished output is copied to
// the embed directory afterwards.
const buildPrerenderedExample = async (
  exampleDir: string,
  slug: string,
  outputDir: string,
): Promise<void> => {
  rmSync(resolve(exampleDir, 'dist'), { recursive: true, force: true })
  await runExampleCommand(exampleDir, slug, [
    'vite',
    'build',
    '--base',
    `/example-apps-embed/${slug}/`,
    '--outDir',
    'dist/client',
  ])
  await runExampleCommand(exampleDir, slug, [
    'vite',
    'build',
    '--ssr',
    'src/entry.server.ts',
    '--outDir',
    'dist/server',
  ])
  await runExampleCommand(exampleDir, slug, ['tsx', 'scripts/prerender.ts'])
  cpSync(resolve(exampleDir, 'dist/client'), outputDir, { recursive: true })
}

const buildExample = async (
  slug: string,
  livePreview: 'Spa' | 'Prerendered',
): Promise<void> => {
  console.log(`Building example: ${slug}`)

  const exampleDir = resolve(EXAMPLES_DIR, slug)
  const outputDir = resolve(OUTPUT_DIR, slug)

  if (livePreview === 'Prerendered') {
    await buildPrerenderedExample(exampleDir, slug, outputDir)
  } else {
    await buildSpaExample(exampleDir, slug, outputDir)
  }

  injectBridgeScript(outputDir)

  console.log(`  → ${outputDir}`)
}

const main = async (): Promise<void> => {
  if (existsSync(OUTPUT_DIR)) {
    rmSync(OUTPUT_DIR, { recursive: true, force: true })
  }
  mkdirSync(OUTPUT_DIR, { recursive: true })

  const embeddedExamples = examples.filter(
    (
      example,
    ): example is (typeof examples)[number] & {
      livePreview: 'Spa' | 'Prerendered'
    } => example.livePreview !== 'PlaygroundOnly',
  )
  const skippedSlugs = examples
    .filter(example => example.livePreview === 'PlaygroundOnly')
    .map(example => example.slug)
  if (skippedSlugs.length > 0) {
    console.log(`Skipping playground-only examples: ${skippedSlugs.join(', ')}`)
  }

  const batchCount = Math.ceil(
    embeddedExamples.length / MAX_CONCURRENT_EXAMPLE_BUILDS,
  )
  const exampleBatches = Array.from({ length: batchCount }, (_, batchIndex) =>
    embeddedExamples.slice(
      batchIndex * MAX_CONCURRENT_EXAMPLE_BUILDS,
      (batchIndex + 1) * MAX_CONCURRENT_EXAMPLE_BUILDS,
    ),
  )

  for (const exampleBatch of exampleBatches) {
    await Promise.all(
      exampleBatch.map(example =>
        buildExample(example.slug, example.livePreview),
      ),
    )
  }

  console.log('')
  console.log(`Built ${embeddedExamples.length} examples into ${OUTPUT_DIR}`)
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
