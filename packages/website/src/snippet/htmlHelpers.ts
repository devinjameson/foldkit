import { html } from 'foldkit/html'

// Create typed HTML helpers for your Message type.
// This ensures event handlers like OnClick only accept your Message variants.

export const {
  // Attributes
  Class,
  Id,
  Href,
  OnClick,
  OnInput,
  OnSubmit,
  Value,
  // Elements
  a,
  button,
  div,
  form,
  h1,
  input,
  p,
  span,
} = html<Message>()
