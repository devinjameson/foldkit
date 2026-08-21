import { Schema } from 'effect'
import { createRequire } from 'node:module'

const PackageJson = Schema.Struct({ version: Schema.String })
const packageJson = Schema.decodeUnknownSync(PackageJson)(
  createRequire(import.meta.url)('../package.json'),
)

/** The installed create-foldkit-app package version. */
export const PACKAGE_VERSION = packageJson.version
