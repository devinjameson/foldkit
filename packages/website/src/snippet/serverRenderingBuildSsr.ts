foldkit({
  buildId,
  ssr: {
    serverEntry: '/src/entry.server.ts',
    build: { entry: '/server/main.ts' },
  },
})
