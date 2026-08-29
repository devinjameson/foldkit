import { Array, Option } from 'effect'
import { type ESTree, type OxlintScope, type Reference } from 'effect-oxlint'

export const isIdentifier = (
  node: unknown,
  name?: string,
): node is Readonly<{ type: 'Identifier'; name: string }> =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'Identifier' &&
  'name' in node &&
  typeof node.name === 'string' &&
  (name === undefined || node.name === name)

export const isIdentifierReference = (
  node: unknown,
): node is ESTree.IdentifierReference => isIdentifier(node)

export const isStringLiteral = (node: unknown): node is ESTree.StringLiteral =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'Literal' &&
  'value' in node &&
  typeof node.value === 'string'

export const isTemplateLiteral = (
  node: unknown,
): node is ESTree.TemplateLiteral =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'TemplateLiteral'

export const isCallExpression = (
  node: unknown,
): node is ESTree.CallExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'CallExpression'

export const isMemberExpression = (
  node: unknown,
): node is ESTree.MemberExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'MemberExpression'

export const isObjectExpression = (
  node: unknown,
): node is ESTree.ObjectExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'ObjectExpression'

export const isObjectProperty = (
  node: unknown,
): node is ESTree.ObjectProperty =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'Property'

export const isArrayExpression = (
  node: unknown,
): node is Readonly<{
  type: 'ArrayExpression'
  elements: ReadonlyArray<unknown>
}> =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'ArrayExpression'

export const isSpreadElement = (node: unknown): boolean =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'SpreadElement'

export const helperCalleeName = (callee: unknown): Option.Option<string> => {
  if (isIdentifier(callee)) {
    return Option.some(callee.name)
  }
  if (
    isMemberExpression(callee) &&
    !callee.computed &&
    isIdentifier(callee.property)
  ) {
    return Option.some(callee.property.name)
  }
  return Option.none()
}

export const calleeMatchesHelperName = (
  callee: unknown,
  helperName: string,
): boolean =>
  Option.exists(helperCalleeName(callee), name => name === helperName)

export const staticStringValue = (node: unknown): Option.Option<string> => {
  if (isStringLiteral(node)) {
    return Option.some(node.value)
  }
  if (isTemplateLiteral(node) && Array.isArrayEmpty(node.expressions)) {
    return Option.flatMap(Array.head(node.quasis), quasi =>
      Option.fromNullishOr(quasi.value.cooked),
    )
  }
  return Option.none()
}

export const staticMemberName = (
  node: ESTree.MemberExpression,
): Option.Option<string> => {
  if (!node.computed && isIdentifier(node.property)) {
    return Option.some(node.property.name)
  }
  return staticStringValue(node.property)
}

export const staticPropertyName = (
  property: Readonly<{
    computed?: boolean
    key: ESTree.PropertyKey
  }>,
): Option.Option<string> => {
  if (!property.computed && isIdentifier(property.key)) {
    return Option.some(property.key.name)
  }
  return staticStringValue(property.key)
}

export const indexReferences = (
  scopes: ReadonlyArray<OxlintScope>,
): WeakMap<ESTree.Node, Reference> => {
  const references = new WeakMap<ESTree.Node, Reference>()

  for (const scope of scopes) {
    for (const reference of scope.references) {
      references.set(reference.identifier, reference)
    }
  }
  return references
}

export const isUnshadowedReference = (
  references: WeakMap<ESTree.Node, Reference> | undefined,
  node: ESTree.Node,
): boolean => {
  if (references === undefined) {
    return true
  }

  const reference = references.get(node)
  return (
    reference !== undefined &&
    (reference.resolved === null || Array.isArrayEmpty(reference.resolved.defs))
  )
}

export const isVariableDeclarator = (
  node: unknown,
): node is ESTree.VariableDeclarator =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'VariableDeclarator'

export const isVariableDeclaration = (
  node: unknown,
): node is ESTree.VariableDeclaration =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'VariableDeclaration'

export const isProgram = (node: unknown): node is ESTree.Program =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'Program'

export const firstStringArgument = (
  node: ESTree.CallExpression,
): ESTree.StringLiteral | undefined => {
  const [first] = node.arguments
  return isStringLiteral(first) ? first : undefined
}
