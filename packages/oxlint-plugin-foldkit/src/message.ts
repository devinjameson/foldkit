import { type ESTree } from 'effect-oxlint'

import {
  isCallExpression,
  isIdentifier,
  isMemberExpression,
  isObjectExpression,
  isStringLiteral,
} from './guards.ts'

const primitiveSchemaNames = new Set(['BigInt', 'Boolean', 'Number', 'String'])

const primitiveSchemaFactoryNames = new Set(['Literal', 'Literals'])

const isSchemaMemberNamed = (node: unknown, names: Set<string>): boolean =>
  isMemberExpression(node) &&
  !node.computed &&
  isIdentifier(node.object, 'S') &&
  isIdentifier(node.property) &&
  names.has(node.property.name)

const isPrimitiveSchema = (node: unknown): boolean =>
  isSchemaMemberNamed(node, primitiveSchemaNames) ||
  (isCallExpression(node) &&
    isSchemaMemberNamed(node.callee, primitiveSchemaFactoryNames))

export const isMCall = (node: ESTree.CallExpression): boolean =>
  isIdentifier(node.callee, 'm')

export const hasMessagePayloadProperty = (
  node: ESTree.CallExpression,
): boolean => {
  const [, second] = node.arguments
  if (!isObjectExpression(second)) {
    return false
  }
  return second.properties.some(
    property =>
      property.type === 'Property' &&
      (isIdentifier(property.key, 'message') ||
        (isStringLiteral(property.key) && property.key.value === 'message')),
  )
}

export const hasPrimitiveMessagePayloadProperty = (
  node: ESTree.CallExpression,
): boolean => {
  const [, second] = node.arguments
  if (!isObjectExpression(second)) {
    return false
  }
  return second.properties.some(
    property =>
      property.type === 'Property' &&
      (isIdentifier(property.key, 'message') ||
        (isStringLiteral(property.key) && property.key.value === 'message')) &&
      isPrimitiveSchema(property.value),
  )
}
