# Oxlint Plugin

## Overview

Foldkit projects use `oxlint` for linting and `@foldkit/oxlint-plugin` for rules that understand Foldkit naming and Message conventions.

## Scaffolded Projects

[Create Foldkit app](/get-started/getting-started) includes `.oxlintrc.json`, a `lint` script, `oxlint`, and `@foldkit/oxlint-plugin`. A generated project enables this starter set of rules:

::Snippet{name="oxlintConfig" label="oxlint config"}

The full rule set is grouped by convention surface below. The rules enabled in the scaffold config above are the starter set; the rest are opt-in. Turn one on by adding `"foldkit/<rule-name>": "error"` to the `rules` block. Each rule covers a Foldkit-specific case that oxlint does not know about on its own.

## Message Naming and Construction {#message-rules}

### foldkit/no-noop-message {#no-noop-message}

Rejects catch-all Messages that make update branches and traces less meaningful. Name the event that happened instead.

::Snippet{name="lintNoNoopMessage" label="foldkit/no-noop-message example"}

### foldkit/message-binding-matches-tag {#message-binding-matches-tag}

Keeps a Message binding and its m() tag identical, so renames do not leave misleading traces behind.

::Snippet{name="lintMessageBindingMatchesTag" label="foldkit/message-binding-matches-tag example"}

### foldkit/no-empty-object-tagged-call {#no-empty-object-tagged-call}

Catches empty-object calls to no-field Message constructors. A no-field Message should be called with no arguments.

::Snippet{name="lintNoEmptyObjectTaggedCall" label="foldkit/no-empty-object-tagged-call example"}

### foldkit/prefer-callable-message-constructor {#prefer-callable-message-constructor}

Prevents constructing Messages by typing or casting object literals. Use the callable Schema constructor instead.

::Snippet{name="lintPreferCallableMessageConstructor" label="foldkit/prefer-callable-message-constructor example"}

## Command Shape {#command-rules}

### foldkit/command-binding-matches-name {#command-binding-matches-name}

Keeps a Command binding name in sync with the name passed to Command.define.

::Snippet{name="lintCommandBindingMatchesName" label="foldkit/command-binding-matches-name example"}

### foldkit/command-define-pascal-const {#command-define-pascal-const}

Requires the const holding a Command.define result to be a non-empty PascalCase identifier that matches the Command name.

::Snippet{name="lintCommandDefinePascalConst" label="foldkit/command-define-pascal-const example"}

### foldkit/no-hand-rolled-command-struct {#no-hand-rolled-command-struct}

Rejects Command structs assembled by hand. Command.define attaches the identity, args, and tracing metadata a plain object literal skips.

::Snippet{name="lintNoHandRolledCommandStruct" label="foldkit/no-hand-rolled-command-struct example"}

## Model Updates {#model-update-rules}

### foldkit/no-spread-in-evo {#no-spread-in-evo}

Rejects object spreads inside an evo updater. Evolve nested fields with a nested evo instead.

::Snippet{name="lintNoSpreadInEvo" label="foldkit/no-spread-in-evo example"}

## Routing {#routing-rules}

### foldkit/no-hardcoded-route-strings {#no-hardcoded-route-strings}

Rejects hardcoded path and URL strings passed to link and navigation helpers. Build them from the Route module so they stay in sync with the routes.

::Snippet{name="lintNoHardcodedRouteStrings" label="foldkit/no-hardcoded-route-strings example"}

## View Keying and Accessibility {#view-rules}

### foldkit/no-array-index-view-keys {#no-array-index-view-keys}

Rejects the array index as a view key. Key by a stable Model identifier, or reordering the list patches the wrong rows.

::Snippet{name="lintNoArrayIndexViewKeys" label="foldkit/no-array-index-view-keys example"}

### foldkit/keyed-required-for-mapped-rows {#keyed-required-for-mapped-rows}

Requires an identity-bearing mapped row element to be wrapped in keyed, so the runtime patches the right rows when the list reorders or shrinks.

::Snippet{name="lintKeyedRequiredForMappedRows" label="foldkit/keyed-required-for-mapped-rows example"}

### foldkit/require-rel-for-external-link {#require-rel-for-external-link}

Requires target="\_blank" links to carry a rel with noopener or noreferrer.

::Snippet{name="lintRequireRelForExternalLink" label="foldkit/require-rel-for-external-link example"}

### foldkit/no-raw-dom-event-attributes {#no-raw-dom-event-attributes}

Rejects raw DOM event attributes. Use the typed event helpers so handlers dispatch Messages through the runtime.

::Snippet{name="lintNoRawDomEventAttributes" label="foldkit/no-raw-dom-event-attributes example"}

### foldkit/no-empty-children-array {#no-empty-children-array}

Catches an inline empty array in the children slot, on element builders and on keyed. The argument is optional, so an element with no children omits it. The shorter form needs the Foldkit release that made children optional, so bump `foldkit` alongside the plugin.

::Snippet{name="lintNoEmptyChildrenArray" label="foldkit/no-empty-children-array example"}

## Purity Boundaries {#purity-rules}

### foldkit/no-module-level-mutable-state {#no-module-level-mutable-state}

Rejects module-level let and var bindings, which hold state outside the Model. Move the data into the Model, or scope a live handle to a lifecycle primitive like Mount or ManagedResource.

::Snippet{name="lintNoModuleLevelMutableState" label="foldkit/no-module-level-mutable-state example"}

### foldkit/no-disabling-dev-guardrails {#no-disabling-dev-guardrails}

Flags turning off the freezeModel or slow dev guardrails. Fix the mutation or slow phase they caught instead of silencing the feedback.

::Snippet{name="lintNoDisablingDevGuardrails" label="foldkit/no-disabling-dev-guardrails example"}

## Submodel Wiring {#submodel-rules}

### foldkit/got-submodel-message-name {#got-submodel-message-name}

Requires wrapper Messages around Submodel Messages to use the Got\*Message convention.

::Snippet{name="lintGotSubmodelMessageName" label="foldkit/got-submodel-message-name example"}

### foldkit/got-prefix-requires-submodel-payload {#got-prefix-requires-submodel-payload}

Reserves the Got\* prefix for Submodel wrappers. Any Got-prefixed Message must include a child Message payload named message.

::Snippet{name="lintGotPrefixRequiresSubmodelPayload" label="foldkit/got-prefix-requires-submodel-payload example"}

### foldkit/wrap-child-output-in-got-message {#wrap-child-output-in-got-message}

Requires child Command and Subscription output to be wrapped through a Got\*Message constructor, preserving the one-wrap-per-level Submodel convention.

::Snippet{name="lintWrapChildOutputInGotMessage" label="foldkit/wrap-child-output-in-got-message example"}

### foldkit/got-wrapper-carries-only-routing {#got-wrapper-carries-only-routing}

Keeps a Got wrapper payload to the child Message plus routing keys: message, id, or keys ending in Id.

::Snippet{name="lintGotWrapperCarriesOnlyRouting" label="foldkit/got-wrapper-carries-only-routing example"}

### foldkit/no-child-message-construction-in-root {#no-child-message-construction-in-root}

Rejects constructing a child Message variant from outside the child. Call a child-exported helper and route its output through the wrapper.

::Snippet{name="lintNoChildMessageConstructionInRoot" label="foldkit/no-child-message-construction-in-root example"}

### foldkit/selection-submodel-factory-at-module-scope {#selection-submodel-factory-at-module-scope}

Requires selection component factories, such as Combobox, Listbox, Menu, and Tabs, to be created at module scope so their identity stays stable across renders.

::Snippet{name="lintSelectionSubmodelFactoryAtModuleScope" label="foldkit/selection-submodel-factory-at-module-scope example"}

## Lifecycle Handles {#lifecycle-rules}

### foldkit/mount-factory-must-use-element {#mount-factory-must-use-element}

Requires a Mount factory to read or write its element. If it never touches the element, the cause was misidentified and Mount is the wrong primitive.

::Snippet{name="lintMountFactoryMustUseElement" label="foldkit/mount-factory-must-use-element example"}

### foldkit/no-duplicate-onmount-per-element {#no-duplicate-onmount-per-element}

Rejects two OnMount handlers on one element, where the second silently overwrites the first.

::Snippet{name="lintNoDuplicateOnmountPerElement" label="foldkit/no-duplicate-onmount-per-element example"}

## DOM and UI Helpers {#dom-ui-rules}

### foldkit/lazy-view-stable-references {#lazy-view-stable-references}

Requires lazy view slots to be declared at module scope so their references stay stable and the memoization actually hits its cache.

::Snippet{name="lintLazyViewStableReferences" label="foldkit/lazy-view-stable-references example"}
