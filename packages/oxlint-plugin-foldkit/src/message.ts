import { Option } from 'effect'
import { type ESTree } from 'effect-oxlint'

import {
  isIdentifier,
  isObjectExpression,
  isStringLiteral,
  staticPropertyName,
} from './guards.ts'

const foldkitMessageModule = 'foldkit/message'

export type MessageCase = Readonly<{
  name: string
  nameNode: ESTree.Node
  fields: ESTree.ObjectExpression
}>

export const recordFoldkitMessageUnionBindings = (
  bindings: Set<string>,
  node: ESTree.Node,
): void => {
  if (node.type !== 'Program') {
    return
  }

  for (const statement of node.body) {
    if (
      statement.type !== 'ImportDeclaration' ||
      statement.importKind === 'type' ||
      statement.source.value !== foldkitMessageModule
    ) {
      continue
    }

    for (const specifier of statement.specifiers) {
      if (
        specifier.type === 'ImportSpecifier' &&
        specifier.importKind !== 'type' &&
        (isIdentifier(specifier.imported, 'defineMessageUnion') ||
          (isStringLiteral(specifier.imported) &&
            specifier.imported.value === 'defineMessageUnion'))
      ) {
        bindings.add(specifier.local.name)
      }
    }
  }
}

export const messageCases = (
  node: ESTree.CallExpression,
  bindings: ReadonlySet<string>,
): ReadonlyArray<MessageCase> => {
  if (!isIdentifier(node.callee) || !bindings.has(node.callee.name)) {
    return []
  }

  const [casesByTag] = node.arguments
  if (!isObjectExpression(casesByTag)) {
    return []
  }

  return casesByTag.properties.flatMap(property => {
    if (property.type !== 'Property') {
      return []
    }

    const maybeName = staticPropertyName(property)
    if (Option.isNone(maybeName) || !isObjectExpression(property.value)) {
      return []
    }

    return [
      {
        name: maybeName.value,
        nameNode: property.key,
        fields: property.value,
      },
    ]
  })
}

export const hasMessagePayloadProperty = (
  fields: ESTree.ObjectExpression,
): boolean =>
  fields.properties.some(
    property =>
      property.type === 'Property' &&
      (isIdentifier(property.key, 'message') ||
        (isStringLiteral(property.key) && property.key.value === 'message')),
  )
