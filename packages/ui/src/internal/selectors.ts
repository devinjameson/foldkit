/**
 * Builds a CSS id selector from an element's id value.
 *
 * The id is escaped with `CSS.escape` so values that are not valid CSS
 * identifiers on their own (most notably ids beginning with a digit, as
 * produced by UUID-prefixed ids) still yield a usable selector.
 */
export const idSelector = (id: string): string => `#${CSS.escape(id)}`

/**
 * Builds a CSS attribute selector matching `attribute` against `value`.
 *
 * The value is quoted and escaped with `CSS.escape`, so values carrying
 * brackets, backslashes, spaces, or a leading digit still yield a usable
 * selector. The quotes are load bearing: an escaped value is a valid CSS
 * identifier but not a valid unquoted attribute value, so dropping them makes
 * selectors for digit-leading ids fail to parse.
 */
export const attributeSelector = (attribute: string, value: string): string =>
  `[${attribute}="${CSS.escape(value)}"]`
