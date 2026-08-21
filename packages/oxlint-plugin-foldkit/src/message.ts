import { Option } from 'effect'
import { type ESTree } from 'effect-oxlint'

import { isIdentifier, isObjectExpression, isStringLiteral } from './guards.ts'

const foldkitMessageModule = 'foldkit/message'

export type MessageCase = Readonly<{
  name: string
  nameNode: ESTree.Node
  fields: ESTree.ObjectExpression
}>

const staticPropertyName = (
  property: ESTree.ObjectPropertyKind,
): Option.Option<Readonly<{ name: string; node: ESTree.Node }>> => {
  if (property.type !== 'Property') {
    return Option.none()
  }

  if (!property.computed && isIdentifier(property.key)) {
    return Option.some({ name: property.key.name, node: property.key })
  }

  if (isStringLiteral(property.key)) {
    return Option.some({ name: property.key.value, node: property.key })
  }

  return Option.none()
}

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
    const maybeName = staticPropertyName(property)
    if (
      property.type !== 'Property' ||
      Option.isNone(maybeName) ||
      !isObjectExpression(property.value)
    ) {
      return []
    }

    return [
      {
        name: maybeName.value.name,
        nameNode: maybeName.value.node,
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
