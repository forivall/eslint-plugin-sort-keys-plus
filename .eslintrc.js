'use strict'

/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  plugins: ['eslint-plugin'],
  extends: ['eslint', 'plugin:eslint-plugin/recommended', 'prettier'],
  settings: {
    jsdoc: {
      mode: 'typescript'
    }
  },
  rules: {
    'no-console': [process.env.NODE_ENV === 'production' ? 'error' : 0, { allow: ['warn', 'error'] }],
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 0,
    'no-var': 'warn',
    'prefer-const': 'warn',
    'no-else-return': 'error',
    'jsdoc/newline-after-description': 0,
    'jsdoc/tag-lines': [
      'error',
      'never',
    ],
    'vue/order-in-components': 0,
  },
  overrides: [
    {
      files: '__tests__/**',
      rules: {
        'jsdoc/require-jsdoc': 'off',
        'node/no-unpublished-require': 'off',
      },
    },
  ],
}
