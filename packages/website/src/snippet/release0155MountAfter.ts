const AnchorPopover = Mount.define('AnchorPopover', {
  args: { buttonId: S.String, anchor: AnchorConfig },
  messages: [CompletedAnchorPopover],
  execute: ({ element, buttonId, anchor }) =>
    Effect.gen(function* () {
      // ...
    }),
})
