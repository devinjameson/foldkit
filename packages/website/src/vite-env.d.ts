/// <reference types="vite/client" />

declare module '*.ts?raw' {
  const content: string
  export default content
}

declare module '*.ts?highlighted' {
  const html: string
  export default html
}
