/// <reference types="vite/client" />

// `@foldkit/vite-plugin` compiles the deployment's build id in here, from its
// `buildId` option or the `FOLDKIT_BUILD_ID` environment variable. The server
// entry hands it to `renderToString` and the client entry to `Runtime.hydrate`,
// which is how hydration tells a page from this deployment apart from one served
// by another.
interface ImportMetaEnv {
  readonly FOLDKIT_BUILD_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
