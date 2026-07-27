// view/docs.ts (parent)
const h = html<Message>()

h.submodel({
  slotId: 'coming-from-react',
  model: model.comingFromReact,
  view: Page.ComingFromReact.view,
  viewInputs: {
    copiedSnippets: model.copiedSnippets,
    // Built in the parent's boundary, so ClickedCopySnippet reaches update
    // unwrapped however deep the child renders it.
    renderCopyButton: defaultRenderCopyButton(model.copiedSnippets),
    renderHeadingLink: headingLinkButton,
  },
  toParentMessage: message => GotComingFromReactMessage({ message }),
})
