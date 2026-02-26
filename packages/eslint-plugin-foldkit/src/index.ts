import type { ESLint, Linter } from 'eslint'

import topLevelLazy from './rules/top-level-lazy'

type FlatConfig = Linter.Config & { plugins: Record<string, ESLint.Plugin> }

const plugin: ESLint.Plugin & { configs: Record<string, FlatConfig> } = {
  meta: {
    name: '@foldkit/eslint-plugin',
    version: '0.1.0',
  },
  rules: {
    'top-level-lazy': topLevelLazy,
  },
  configs: {},
}

plugin.configs['recommended'] = {
  plugins: { '@foldkit': plugin },
  rules: {
    '@foldkit/top-level-lazy': 'error',
  },
}

export default plugin
