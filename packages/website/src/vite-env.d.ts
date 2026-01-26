/// <reference types="vite/client" />

declare module '*.ts?raw' {
  const content: string
  export default content
}

declare module '*.ts?highlighted' {
  const html: string
  export default html
}

declare module '*.tsx?raw' {
  const content: string
  export default content
}

declare module '*.tsx?highlighted' {
  const html: string
  export default html
}
