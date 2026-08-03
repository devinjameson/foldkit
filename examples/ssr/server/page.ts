const TITLE_PATTERN = /<title>[^<]*<\/title>/
const HTML_OPEN_TAG_PATTERN = /<html([^>]*)>/
const ROOT_PLACEHOLDER = '<div id="root"></div>'

const escapeText = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const escapeAttribute = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

const setAttribute = (
  attributes: string,
  name: string,
  value: string,
): string => {
  const withoutExisting = attributes.replace(
    new RegExp(`\\s${name}="[^"]*"`, 'i'),
    '',
  )
  return `${withoutExisting} ${name}="${escapeAttribute(value)}"`
}

// NOTE: rewrites the `<html>` element's `lang` and `dir` from the server
// render so the served shell carries the right language on first paint,
// before the runtime boots. Only sets an attribute the render provides,
// leaving the template's value in place otherwise.
const applyRootAttributes = (
  template: string,
  lang: string | undefined,
  dir: string | undefined,
): string => {
  if (lang === undefined && dir === undefined) {
    return template
  }
  return template.replace(HTML_OPEN_TAG_PATTERN, (_match, attributes) => {
    let nextAttributes = attributes
    if (lang !== undefined) {
      nextAttributes = setAttribute(nextAttributes, 'lang', lang)
    }
    if (dir !== undefined) {
      nextAttributes = setAttribute(nextAttributes, 'dir', dir)
    }
    return `<html${nextAttributes}>`
  })
}

/** Places a rendered page into the HTML template: the stamped root markup
 *  (plus the flags payload script) replaces the container placeholder, so
 *  the booting runtime finds the root by its `data-foldkit-app` stamp and
 *  hydrates in place. The title and the `<html>` language and direction are
 *  stamped from the render so the served HTML is correct before the runtime
 *  boots.
 *
 *  The body and title replacements are passed as functions. A string second
 *  argument to `String.replace` treats `$&`, `$\``, `$'`, and `$$` as
 *  insertion patterns, so a `$` sequence in the rendered markup or title would
 *  corrupt the output; a replacer function inserts its return value verbatim. */
export const injectIntoTemplate = (
  template: string,
  rendered: Readonly<{
    html: string
    title: string
    lang?: string
    dir?: string
  }>,
): string =>
  applyRootAttributes(template, rendered.lang, rendered.dir)
    .replace(
      TITLE_PATTERN,
      () => `<title>${escapeText(rendered.title)}</title>`,
    )
    .replace(ROOT_PLACEHOLDER, () => rendered.html)
