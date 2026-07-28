import type { Html, HtmlBuilder } from 'foldkit/html'

const cartView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      summaryView(model, h),
      ...(model.hasDiscount ? [discountView(model, h)] : []),
      checkoutView(model, h),
    ],
  )
