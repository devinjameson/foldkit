export const formatPrice = (cents: number): string =>
  `$${(cents / 100).toFixed(2)}`
