import type { Rule } from 'eslint'

const FACTORY_NAMES = new Set(['createLazy', 'createKeyedLazy'])
const SOURCE_MODULE = 'foldkit/html'
const NAMESPACE_MODULE = 'foldkit'

const FUNCTION_TYPES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
])

/** Walks ancestors to determine if the node is inside a function scope. */
const isInsideFunction = (
  ancestors: ReadonlyArray<{ type: string }>,
): boolean => ancestors.some(node => FUNCTION_TYPES.has(node.type))

/** Extracts the original name from an import specifier (handles both
 *  `import { createLazy }` and string-literal import syntax). */
const getImportedName = (specifier: {
  imported: { type: string; name?: string; value?: unknown }
}): string | undefined =>
  specifier.imported.type === 'Identifier'
    ? specifier.imported.name
    : undefined

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Enforce that createLazy and createKeyedLazy are called at module top level',
    },
    messages: {
      notTopLevel:
        '{{ name }}() must be called at module top level. ' +
        'Calling it inside a function creates a new cache on every invocation, silently defeating memoization.',
    },
    schema: [],
  },

  create(context) {
    const trackedIdentifiers = new Set<string>()
    const trackedNamespaces = new Set<string>()

    return {
      ImportDeclaration(node) {
        const source = node.source.value

        if (source === SOURCE_MODULE) {
          for (const specifier of node.specifiers) {
            if (specifier.type === 'ImportSpecifier') {
              const name = getImportedName(specifier)
              if (name !== undefined && FACTORY_NAMES.has(name)) {
                trackedIdentifiers.add(specifier.local.name)
              }
            }

            if (specifier.type === 'ImportNamespaceSpecifier') {
              trackedNamespaces.add(specifier.local.name)
            }
          }
        }

        if (source === NAMESPACE_MODULE) {
          for (const specifier of node.specifiers) {
            if (specifier.type === 'ImportSpecifier') {
              const name = getImportedName(specifier)
              if (name === 'Html') {
                trackedNamespaces.add(specifier.local.name)
              }
            }

            if (specifier.type === 'ImportNamespaceSpecifier') {
              trackedNamespaces.add(specifier.local.name)
            }
          }
        }
      },

      CallExpression(node) {
        const { callee } = node
        let factoryName: string | undefined

        if (
          callee.type === 'Identifier' &&
          trackedIdentifiers.has(callee.name)
        ) {
          factoryName = callee.name
        }

        if (
          callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          trackedNamespaces.has(callee.object.name) &&
          callee.property.type === 'Identifier' &&
          FACTORY_NAMES.has(callee.property.name)
        ) {
          factoryName = callee.property.name
        }

        if (factoryName === undefined) {
          return
        }

        const ancestors = context.sourceCode.getAncestors(node)

        if (isInsideFunction(ancestors)) {
          context.report({
            node,
            messageId: 'notTopLevel',
            data: { name: factoryName },
          })
        }
      },
    }
  },
}

export default rule
