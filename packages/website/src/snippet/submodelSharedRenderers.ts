// view/docs.ts (inside the parent's view, with its builder `h` in scope)
h.submodel({
  slotId: 'coming-from-react',
  model: model.comingFromReact,
  view: Page.ComingFromReact.view,
  viewInputs: {
    // Both close over the parent's builder, so the app-level Messages they
    // dispatch reach update unwrapped however deep the child renders them.
    renderCopyButton: defaultRenderCopyButton(model.copiedSnippets, h),
    renderHeadingLink: defaultRenderHeadingLink(h),
  },
  toParentMessage: message => GotComingFromReactMessage({ message }),
})
