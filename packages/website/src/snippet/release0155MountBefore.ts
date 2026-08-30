const AnchorPopover = Mount.define(
  'AnchorPopover',
  { buttonId: S.String, anchor: AnchorConfig },
  CompletedAnchorPopover,
)(
  ({ buttonId, anchor }) =>
    element =>
      Effect.gen(function* () {
        // ...
      }),
)
