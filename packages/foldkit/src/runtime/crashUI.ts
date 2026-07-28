import { Effect } from 'effect'

import { Document, inertHtml as ih } from '../html/index.js'

export const noOpDispatch = {
  dispatchAsync: (_message: unknown) => Effect.void,
  dispatchSync: (_message: unknown) => {},
}

const colors = {
  bg: '#f9fafb',
  cardBg: '#ffffff',
  border: '#e5e7eb',
  errorAccent: '#dc2626',
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  codeBg: '#f3f4f6',
  buttonBg: '#18181b',
  buttonText: '#ffffff',
}

const fontStack =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
const monoStack =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace'

export const defaultCrashView = (
  context: Readonly<{ error: Error }>,
  viewError?: unknown,
): Document => {
  const codeBlockStyle = ih.Style({
    fontFamily: monoStack,
    color: colors.textPrimary,
    margin: '0',
    fontSize: '0.9375rem',
    lineHeight: '1.5',
    backgroundColor: colors.codeBg,
    padding: '0.75rem 1rem',
    borderRadius: '0.375rem',
  })

  const labelStyle = ih.Style({
    color: colors.textSecondary,
    margin: '0 0 0.5rem 0',
    fontSize: '0.875rem',
    fontWeight: '500',
  })

  const inlineCodeStyle = ih.Style({
    fontFamily: monoStack,
    backgroundColor: colors.codeBg,
    padding: '0.125rem 0.375rem',
    borderRadius: '0.25rem',
  })

  const viewErrorMessage =
    viewError instanceof Error ? viewError.message : String(viewError)

  const introText = viewError
    ? [
        'Your custom ',
        ih.span([inlineCodeStyle], ['crash.view']),
        ' threw an error while rendering.',
      ]
    : [
        'Foldkit encountered an unrecoverable error while running your application.',
      ]

  const errorContent = viewError
    ? [
        ih.div(
          [ih.Style({ margin: '0 0 1rem 0' })],
          [
            ih.p([labelStyle], ['Original error']),
            ih.p([codeBlockStyle], [context.error.message]),
          ],
        ),
        ih.div(
          [ih.Style({ margin: '0 0 1.25rem 0' })],
          [
            ih.p([labelStyle], ['crash.view error']),
            ih.p([codeBlockStyle], [viewErrorMessage]),
          ],
        ),
      ]
    : [
        ih.p(
          [
            ih.Style({
              fontFamily: monoStack,
              color: colors.textPrimary,
              margin: '0 0 1.25rem 0',
              fontSize: '0.9375rem',
              lineHeight: '1.5',
              backgroundColor: colors.codeBg,
              padding: '0.75rem 1rem',
              borderRadius: '0.375rem',
            }),
          ],
          [context.error.message],
        ),
      ]

  const footerText = viewError
    ? []
    : [
        ih.p(
          [
            ih.Style({
              color: colors.textSecondary,
              margin: '1.5rem 0 0 0',
              fontSize: '0.875rem',
              lineHeight: '1.5',
              borderTop: `1px solid ${colors.border}`,
              paddingTop: '1rem',
            }),
          ],
          [
            'This is the default crash view. You can customize it by providing a ',
            ih.span([inlineCodeStyle], ['crash.view']),
            ' function.',
          ],
        ),
      ]

  const body = ih.div(
    [
      ih.Style({
        fontFamily: fontStack,
        padding: '2rem',
        minHeight: '100vh',
        backgroundColor: colors.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }),
    ],
    [
      ih.div(
        [
          ih.Style({
            width: '100%',
            maxWidth: '960px',
            margin: '0 auto',
            backgroundColor: colors.cardBg,
            borderRadius: '0 0.5rem 0.5rem 0',
            border: `1px solid ${colors.border}`,
            borderLeft: `4px solid ${colors.errorAccent}`,
            padding: '1.5rem',
          }),
        ],
        [
          ih.h1(
            [
              ih.Style({
                color: colors.errorAccent,
                margin: '0 0 0.75rem 0',
                fontSize: '1.25rem',
                fontWeight: '600',
                lineHeight: '1.5',
              }),
            ],
            ['Application Crash'],
          ),
          ih.p(
            [
              ih.Style({
                color: colors.textPrimary,
                margin: '0 0 1rem 0',
                fontSize: '1rem',
                lineHeight: '1.625',
              }),
            ],
            introText,
          ),
          ...errorContent,
          ih.p(
            [
              ih.Style({
                color: colors.textPrimary,
                margin: '0 0 1.5rem 0',
                fontSize: '1rem',
                lineHeight: '1.5',
              }),
            ],
            [
              '→ Check the browser console for the full stack trace with source-mapped line numbers.',
            ],
          ),
          ih.button(
            [
              ih.Style({
                fontFamily: fontStack,
                backgroundColor: colors.buttonBg,
                color: colors.buttonText,
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
              }),
              ih.Attribute('onclick', 'location.reload()'),
            ],
            ['Reload'],
          ),
          ...footerText,
        ],
      ),
    ],
  )

  return { title: 'Application Crash', body }
}
