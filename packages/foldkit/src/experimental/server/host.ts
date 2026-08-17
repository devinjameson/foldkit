// NOTE: request-classification primitives shared by the dev host (the Vite
// plugin), the reference server, and the scaffold, so development predicts
// production. `acceptsHtml` parses the `Accept` header the way a browser
// negotiates content, and `resolvesToIndexHtml` normalizes a request path the
// way a static file server does, both of which are easy to get subtly wrong
// when duplicated per host.

const HTML_RANGE_SPECIFICITY: Readonly<Record<string, number>> = {
  'text/html': 3,
  'text/*': 2,
  '*/*': 1,
}

const qualityOf = (parameters: ReadonlyArray<string>): number => {
  for (const parameter of parameters) {
    const separator = parameter.indexOf('=')
    if (separator === -1) {
      continue
    }
    const name = parameter.slice(0, separator).trim().toLowerCase()
    if (name !== 'q') {
      continue
    }
    const value = Number(parameter.slice(separator + 1).trim())
    return Number.isNaN(value) ? 1 : value
  }
  return 1
}

// NOTE: split on a delimiter only where it is not inside a double-quoted string,
// so a quoted media-type parameter (`text/html;profile="a,b"`) is not torn apart
// at the comma or semicolon inside its value. A backslash inside a quoted string
// escapes the next character, so an escaped quote (`"a\",b"`) does not end the
// string and its delimiter stays quoted.
const splitOutsideQuotes = (
  value: string,
  delimiter: string,
): ReadonlyArray<string> => {
  const parts: Array<string> = []
  let current = ''
  let isInQuotes = false
  let isEscaped = false
  for (const character of value) {
    if (isEscaped) {
      current += character
      isEscaped = false
    } else if (isInQuotes && character === '\\') {
      current += character
      isEscaped = true
    } else if (character === '"') {
      isInQuotes = !isInQuotes
      current += character
    } else if (character === delimiter && !isInQuotes) {
      parts.push(current)
      current = ''
    } else {
      current += character
    }
  }
  parts.push(current)
  return parts
}

/**
 * Decides whether a client accepts an HTML response, given its `Accept`
 * header. An absent or empty header accepts anything. Otherwise the most
 * specific media range that covers `text/html` (`text/html`, then `text/*`,
 * then `*​/*`) decides, using its `q` value, so `text/html;q=0` is refused
 * even alongside `*​/*`.
 *
 * A page host renders the application for a request that accepts HTML and
 * serves a non-page response otherwise, so this is the negotiation a host runs
 * before falling through to a render.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export const acceptsHtml = (acceptHeader: string | undefined): boolean => {
  if (acceptHeader === undefined || acceptHeader.trim() === '') {
    return true
  }

  let bestSpecificity = 0
  let bestQuality = 0
  for (const range of splitOutsideQuotes(acceptHeader, ',')) {
    const parts = splitOutsideQuotes(range, ';')
    const mediaType = parts[0]?.trim().toLowerCase() ?? ''
    const specificity = HTML_RANGE_SPECIFICITY[mediaType]
    if (specificity === undefined) {
      continue
    }
    if (specificity > bestSpecificity) {
      bestSpecificity = specificity
      bestQuality = qualityOf(parts.slice(1))
    }
  }

  return bestSpecificity > 0 && bestQuality > 0
}

/**
 * Merges the `Accept` field name into an existing `Vary` header value, parsing
 * it as a comma-separated, case-insensitive list of field names. `Vary: *`
 * already varies on everything and is returned unchanged, an existing `Accept`
 * token (in any case, and distinct from `Accept-Language` or `Accept-Encoding`)
 * is not duplicated, and otherwise `Accept` is appended.
 *
 * A page host that negotiates HTML on the `Accept` header must declare that in
 * `Vary` so a shared cache does not serve one representation in place of the
 * other. The dev host, reference server, and scaffold merge through this one
 * helper so a comma-joined field-name string like `Accept-Language` is never
 * mistaken for the `Accept` field.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export const varyWithAccept = (existing: string | undefined): string => {
  const tokens =
    existing === undefined
      ? []
      : existing
          .split(',')
          .map(token => token.trim())
          .filter(token => token !== '')
  const lowered = tokens.map(token => token.toLowerCase())
  if (lowered.includes('*')) {
    return '*'
  }
  if (lowered.includes('accept')) {
    return tokens.join(', ')
  }
  return [...tokens, 'Accept'].join(', ')
}

const normalizePath = (path: string): string => {
  const segments: Array<string> = []
  for (const segment of path.split('/')) {
    if (segment === '' || segment === '.') {
      continue
    }
    if (segment === '..') {
      segments.pop()
      continue
    }
    segments.push(segment)
  }
  return segments.join('/')
}

/**
 * Decides whether a request path resolves to the `index.html` template, the
 * way a static file server resolves it: percent-decoded, backslashes and
 * repeated separators collapsed, and dot segments resolved. A host renders the
 * application for such a request rather than serving the raw, unfilled
 * template, so `/`, `/index.html`, `/%2findex.html`, and `/foo/../index.html`
 * all resolve to it. An undecodable or null-byte path resolves to nothing.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export const resolvesToIndexHtml = (requestUrl: string): boolean => {
  let pathname: string
  try {
    pathname = new URL(requestUrl, 'http://localhost').pathname
  } catch {
    return false
  }
  let decoded: string
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return false
  }
  if (decoded.includes('\0')) {
    return false
  }
  const normalized = normalizePath(decoded.replace(/\\/g, '/'))
  return normalized === '' || normalized.toLowerCase() === 'index.html'
}
