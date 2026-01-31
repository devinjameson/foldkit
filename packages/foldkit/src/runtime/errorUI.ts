import { Effect } from 'effect'
import { h } from 'snabbdom'

import { Html, html } from '../html'
import { patch, toVNode } from '../vdom'
import { Dispatch } from './runtime'

const noOpDispatch = {
  dispatchAsync: (_message: unknown) => Effect.void,
  dispatchSync: (_message: unknown) => {},
}

export const renderHtml = (
  container: HTMLElement,
  html: Html,
): Effect.Effect<void> =>
  html.pipe(
    Effect.map((vnode) => {
      const targetVNode = vnode ?? h('#text', {}, '')
      patch(toVNode(container), targetVNode)
    }),
    Effect.provideService(Dispatch, noOpDispatch),
  )

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

export const defaultErrorView = (error: Error, viewError?: unknown): Html => {
  const { div, h1, p, span, button, Style, Attribute } = html()

  const codeBlockStyle = Style({
    fontFamily: monoStack,
    color: colors.textPrimary,
    margin: '0',
    fontSize: '0.9375rem',
    lineHeight: '1.5',
    backgroundColor: colors.codeBg,
    padding: '0.75rem 1rem',
    borderRadius: '0.375rem',
  })

  const labelStyle = Style({
    color: colors.textSecondary,
    margin: '0 0 0.5rem 0',
    fontSize: '0.875rem',
    fontWeight: '500',
  })

  const inlineCodeStyle = Style({
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
        span([inlineCodeStyle], ['errorView']),
        ' threw an error while rendering.',
      ]
    : [
        'Foldkit encountered an unrecoverable error while running your application.',
      ]

  const errorContent = viewError
    ? [
        div(
          [Style({ margin: '0 0 1rem 0' })],
          [
            p([labelStyle], ['Original error']),
            p([codeBlockStyle], [error.message]),
          ],
        ),
        div(
          [Style({ margin: '0 0 1.25rem 0' })],
          [
            p([labelStyle], ['errorView error']),
            p([codeBlockStyle], [viewErrorMessage]),
          ],
        ),
      ]
    : [
        p(
          [
            Style({
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
          [error.message],
        ),
      ]

  const footerText = viewError
    ? []
    : [
        p(
          [
            Style({
              color: colors.textSecondary,
              margin: '1.5rem 0 0 0',
              fontSize: '0.875rem',
              lineHeight: '1.5',
              borderTop: `1px solid ${colors.border}`,
              paddingTop: '1rem',
            }),
          ],
          [
            'This is the default error view. You can customize it by providing an ',
            span([inlineCodeStyle], ['errorView']),
            ' function to ',
            span([inlineCodeStyle], ['makeElement']),
            ' or ',
            span([inlineCodeStyle], ['makeApplication']),
            '.',
          ],
        ),
      ]

  return div(
    [
      Style({
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
      div(
        [
          Style({
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
          h1(
            [
              Style({
                color: colors.errorAccent,
                margin: '0 0 0.75rem 0',
                fontSize: '1.25rem',
                fontWeight: '600',
                lineHeight: '1.5',
              }),
            ],
            ['Runtime Error'],
          ),
          p(
            [
              Style({
                color: colors.textPrimary,
                margin: '0 0 1rem 0',
                fontSize: '1rem',
                lineHeight: '1.625',
              }),
            ],
            introText,
          ),
          ...errorContent,
          p(
            [
              Style({
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
          button(
            [
              Style({
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
              Attribute('onclick', 'location.reload()'),
            ],
            ['Reload'],
          ),
          ...footerText,
        ],
      ),
    ],
  )
}
