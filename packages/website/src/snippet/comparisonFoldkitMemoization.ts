const lazyHeader = createLazy()
const lazyToolPanel = createLazy()
const lazyHistoryPanel = createLazy()
const lazyRow = createKeyedLazy()

// Each args array is compared element-by-element against the previous render.
// If every arg is reference-equal, the view function isn't called at all.
// evo() preserves references for unchanged Model fields, so the check just
// works, and the builder is the same object every render, so passing it
// through the args never invalidates the cache.
export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Pixel Art',
  body: h.div(
    [],
    [
      lazyHeader(headerView, [h]),
      lazyToolPanel(toolPanelView, [
        model.mirrorMode,
        model.tool,
        model.gridSize,
        model.selectedColorIndex,
        isGridEmpty(model.grid),
        theme,
        model.themeListbox,
        h,
      ]),
      canvasView(model, theme, h),
      lazyHistoryPanel(historyPanelView, [
        model.undoStack,
        model.redoStack,
        currentGrid,
        model.gridSize,
        theme,
        h,
      ]),
    ],
  ),
})
