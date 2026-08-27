import { Plugin } from 'effect-oxlint'

import { commandBindingMatchesName } from './rules/command-binding-matches-name.ts'
import { commandDefinePascalConst } from './rules/command-define-pascal-const.ts'
import { gotPrefixRequiresSubmodelPayload } from './rules/got-prefix-requires-submodel-payload.ts'
import { gotSubmodelMessageName } from './rules/got-submodel-message-name.ts'
import { gotWrapperCarriesOnlyRouting } from './rules/got-wrapper-carries-only-routing.ts'
import { keyedRequiredForMappedRows } from './rules/keyed-required-for-mapped-rows.ts'
import { lazyViewStableReferences } from './rules/lazy-view-stable-references.ts'
import { mountFactoryMustUseElement } from './rules/mount-factory-must-use-element.ts'
import { noArrayIndexViewKeys } from './rules/no-array-index-view-keys.ts'
import { noChildMessageConstructionInRoot } from './rules/no-child-message-construction-in-root.ts'
import { noDisablingDevGuardrails } from './rules/no-disabling-dev-guardrails.ts'
import { noDuplicateOnmountPerElement } from './rules/no-duplicate-onmount-per-element.ts'
import { noEmptyChildrenArray } from './rules/no-empty-children-array.ts'
import { noEmptyCommandsArray } from './rules/no-empty-commands-array.ts'
import { noEmptyObjectTaggedCall } from './rules/no-empty-object-tagged-call.ts'
import { noEmptyToParentOutMessage } from './rules/no-empty-to-parent-out-message.ts'
import { noHandRolledCommandStruct } from './rules/no-hand-rolled-command-struct.ts'
import { noHardcodedRouteStrings } from './rules/no-hardcoded-route-strings.ts'
import { noModuleLevelMutableState } from './rules/no-module-level-mutable-state.ts'
import { noNonportableServerGlobals } from './rules/no-nonportable-server-globals.ts'
import { noNoopMessage } from './rules/no-noop-message.ts'
import { noRawDomEventAttributes } from './rules/no-raw-dom-event-attributes.ts'
import { noSpreadInEvo } from './rules/no-spread-in-evo.ts'
import { preferCallableMessageConstructor } from './rules/prefer-callable-message-constructor.ts'
import { requireRelForExternalLink } from './rules/require-rel-for-external-link.ts'
import { selectionSubmodelFactoryAtModuleScope } from './rules/selection-submodel-factory-at-module-scope.ts'
import { wrapChildOutputInGotMessage } from './rules/wrap-child-output-in-got-message.ts'

const basePlugin = Plugin.define({
  name: 'foldkit',
  specifier: '@foldkit/oxlint-plugin',
  rules: {
    'command-binding-matches-name': commandBindingMatchesName,
    'command-define-pascal-const': commandDefinePascalConst,
    'got-prefix-requires-submodel-payload': gotPrefixRequiresSubmodelPayload,
    'got-submodel-message-name': gotSubmodelMessageName,
    'got-wrapper-carries-only-routing': gotWrapperCarriesOnlyRouting,
    'keyed-required-for-mapped-rows': keyedRequiredForMappedRows,
    'lazy-view-stable-references': lazyViewStableReferences,
    'mount-factory-must-use-element': mountFactoryMustUseElement,
    'no-array-index-view-keys': noArrayIndexViewKeys,
    'no-child-message-construction-in-root': noChildMessageConstructionInRoot,
    'no-disabling-dev-guardrails': noDisablingDevGuardrails,
    'no-duplicate-onmount-per-element': noDuplicateOnmountPerElement,
    'no-empty-children-array': noEmptyChildrenArray,
    'no-empty-commands-array': noEmptyCommandsArray,
    'no-empty-to-parent-out-message': noEmptyToParentOutMessage,
    'no-empty-object-tagged-call': noEmptyObjectTaggedCall,
    'no-hand-rolled-command-struct': noHandRolledCommandStruct,
    'no-hardcoded-route-strings': noHardcodedRouteStrings,
    'no-module-level-mutable-state': noModuleLevelMutableState,
    'no-nonportable-server-globals': noNonportableServerGlobals,
    'no-noop-message': noNoopMessage,
    'no-raw-dom-event-attributes': noRawDomEventAttributes,
    'no-spread-in-evo': noSpreadInEvo,
    'prefer-callable-message-constructor': preferCallableMessageConstructor,
    'require-rel-for-external-link': requireRelForExternalLink,
    'selection-submodel-factory-at-module-scope':
      selectionSubmodelFactoryAtModuleScope,
    'wrap-child-output-in-got-message': wrapChildOutputInGotMessage,
  },
})

type Override = Readonly<{
  files: Array<string>
  excludeFiles?: Array<string>
  rules: Record<string, Plugin.RuleSeverity>
}>

type OverriddenConfig = Plugin.OxlintConfig & {
  overrides: Array<Override>
}

const testFilePatterns = [
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/*.spec.ts',
  '**/*.spec.tsx',
]

const serverFilePatterns = [
  '**/entry.server.ts',
  '**/entry.server.tsx',
  '**/server/**/*.ts',
  '**/server/**/*.tsx',
  '**/prerender.ts',
]

const serverOverride: Override = {
  files: serverFilePatterns,
  excludeFiles: testFilePatterns,
  rules: {
    'foldkit/no-nonportable-server-globals': 'error',
  },
}

// Foldkit rules police application definitions. Tests exercise those
// definitions rather than write them, so the rules are inert at best and
// invert at worst (a test may legitimately hardcode a route or hand-roll a
// Command struct). Scope every foldkit rule off in test files by default; a
// rule that wants test coverage opts in explicitly.
const testOverride = (config: Plugin.OxlintConfig): Override => ({
  files: testFilePatterns,
  rules: Object.fromEntries(
    Object.keys(config.rules).map((id): [string, Plugin.RuleSeverity] => [
      id,
      'off',
    ]),
  ),
})

const withOverrides = (config: Plugin.OxlintConfig): OverriddenConfig => ({
  ...config,
  rules: {
    ...config.rules,
    'foldkit/no-nonportable-server-globals': 'off',
  },
  overrides: [serverOverride, testOverride(config)],
})

export default {
  ...basePlugin,
  configs: {
    recommended: withOverrides(basePlugin.configs.recommended),
    all: withOverrides(basePlugin.configs.all),
  },
}
