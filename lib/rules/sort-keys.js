/**
 * @fileoverview Rule to require object keys to be sorted
 * @author Toru Nagashima
 */

'use strict'

// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

const reportUtils = require('./utils/report-utils'),
  sharedUtils = require('../shared/utils'),
  sortKeysUtils = require('./utils/sort-keys-utils')

// ------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------

/** @typedef {import('../shared/types').ASTNode} ASTNode */
/** @typedef {import('../shared/types').ASTPropertyKeyNode} ASTPropertyKeyNode */
/** @typedef {import('../shared/types').SortOrderOverride} SortOrderOverride */
/** @typedef {import('../shared/types').SortRuleOptions} SortRuleOptions */

/**
 * @typedef Stack
 * @property {Stack | null} upper
 * @property {boolean} ignore
 * @property {import('estree').Property & import('eslint').Rule.NodeParentExtension | null} prevNode
 * @property {boolean} prevBlankLine
 * @property {string | null} prevName
 * @property {boolean} prevNameSkipped
 * @property {number} numKeys
 * @property {string} parentName
 * @property {SortOrderOverride} override
 * @property {sortKeysUtils.IsValidOrder} isValidOrderOverride
 */

/**
 * Function to check that 2 nodes are proper shorthand order
 * @param {ASTNode} a first node
 * @param {ASTNode} b second node
 * @returns {boolean | null} if the values are in valid order; null if both are shorthand or both not shorthand
 * @private
 */
function isValidShorthandTest(a, b) {
  return !a.shorthand === !b.shorthand ? null : Boolean(a.shorthand && !b.shorthand)
}

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      description: 'require object keys to be sorted',
      category: 'Stylistic Issues',
      recommended: false,
      url: 'https://github.com/forivall/eslint-plugin-sort-keys-plus#rule-configuration',
    },

    schema: [
      {
        enum: ['asc', 'desc'],
      },
      {
        type: 'object',
        properties: {
          caseSensitive: {
            type: 'boolean',
            default: true,
          },
          natural: {
            type: 'boolean',
            default: false,
          },
          minKeys: {
            type: 'integer',
            minimum: 2,
            default: 2,
          },
          allowLineSeparatedGroups: {
            type: 'boolean',
            default: false,
          },
          ignoreSingleLine: {
            type: 'boolean',
            default: false,
          },
          allCaps: {
            enum: ['first', 'last', 'ignore'],
            default: 'ignore',
          },
          shorthand: {
            enum: ['first', 'last', 'ignore'],
            default: 'ignore',
          },
          overrides: {
            type: 'array',
            items: {
              type: 'object',
              required: ['order'],
              properties: {
                message: { type: 'string' },
                order: {
                  type: 'array',
                  minLength: 1,
                  items: {
                    type: 'string',
                  },
                },
                properties: {
                  type: 'array',
                  minLength: 1,
                  items: { type: 'string' },
                },
              },
            },
            default: [],
          },
        },
        additionalProperties: false,
      },
    ],

    messages: {
      sortKeys:
        "Expected object keys to be in {{natural}}{{insensitive}}{{order}}ending order. '{{thisName}}' should be before '{{prevName}}'.",
      sortKeysAllCaps:
        "Expected all caps object keys to be {{allCaps}}. '{{thisName}}' should be before '{{prevName}}'.",
      sortKeysOverride:
        "Expected {{parentName}} object keys to be in custom order. '{{thisName}}' should be before '{{prevName}}'.",
      sortKeysShorthand:
        "Expected shorthand properties to be {{shorthand}}. '{{thisName}}' should be before '{{prevName}}'.",
    },
  },

  create(context) {
    // Parse options.
    /** @type {'asc' | 'desc'} */
    const order = context.options[0] || 'asc'
    /** @type {SortRuleOptions | undefined} */
    const options = context.options[1]
    const insensitive = options && options.caseSensitive === false
    const natural = options && options.natural
    const minKeys = (options && options.minKeys) || 2
    const allowLineSeparatedGroups = (options && options.allowLineSeparatedGroups) || false
    const ignoreSingleLine = (options && options.ignoreSingleLine) || false
    const allCaps = (options && options.allCaps) || 'ignore'
    const shorthand = (options && options.shorthand) || 'ignore'
    /** @type {SortOrderOverride[]} */
    const overrides = (options && options.overrides) || []
    /** @type {Map<string | undefined, SortOrderOverride>} */
    const propOverrides = new Map(
      overrides.flatMap(item => (item.properties ? item.properties.map(property => [property, item]) : [])),
    )
    /** @type {Map<string, SortOrderOverride>} */
    const otherOverrides = new Map()

    overrides.forEach(override => {
      if (override.properties) {
        return
      }

      const sorted = override.order.concat().sort()

      sharedUtils.combination(sorted, minKeys).forEach(combo => {
        const key = combo.join()
        const existing = otherOverrides.get(key)

        if (!existing || override.order.length < existing.order.length) {
          otherOverrides.set(key, override)
        }
      })
    })
    const isValidOrderAlpha = sortKeysUtils.isValidOrders[`${order}${insensitive ? 'I' : ''}${natural ? 'N' : ''}`]
    const isValidOrderAllCaps = sortKeysUtils.firstLastTest(allCaps, sortKeysUtils.isValidAllCapsTest)
    const isValidOrderShorthand = sortKeysUtils.firstLastTest(shorthand, isValidShorthandTest)

    /**
     * The stack to save the previous property's name for each object literals.
     * @type {Stack | null}
     */
    let stack = null

    /**
     * Spread element parser
     * @param {import('estree').SpreadElement & import('eslint').Rule.NodeParentExtension} node AST Node
     * @returns {void}
     */
    function SpreadElement(node) {
      if (node.parent.type === 'ObjectExpression') {
        stack.prevNode = null
        stack.prevName = null
        stack.prevNameSkipped = false
      }
    }

    return {
      ExperimentalSpreadProperty: SpreadElement,

      ObjectExpression(node) {
        /** @type {ASTNode} */
        const parent = node.parent
        let parentName
        let override

        if (parent.type === 'Property' && !parent.computed) {
          /** @type {ASTPropertyKeyNode} */
          const parentKey = parent.key

          parentName = typeof parentKey.value === 'string' ? parentKey.value : parentKey.name
          override = propOverrides.get(parentName)
        }
        if (!override && otherOverrides.size > 0) {
          const key = node.properties
            .map(sortKeysUtils.getPropertyName)
            .filter(name => name !== null)
            .sort()
            .join()

          override = otherOverrides.get(key)
        }

        stack = {
          upper: stack,
          ignore: (stack && stack.ignore) || (ignoreSingleLine && node.loc.start.line === node.loc.end.line),
          prevNode: null,
          prevBlankLine: false,
          prevName: null,
          prevNameSkipped: false,
          numKeys: node.properties.length,
          parentName,
          override,
          isValidOrderOverride: override && sortKeysUtils.validCustomOrderComparator(override.order),
        }
      },

      'ObjectExpression:exit'() {
        stack = stack.upper
      },

      SpreadElement,

      Property(node) {
        if (node.parent.type === 'ObjectPattern' || stack.ignore) {
          return
        }

        const prevNode = stack.prevNode
        const prevName = stack.prevName
        const prevNameSkipped = stack.prevNameSkipped
        const fixable = !prevNameSkipped
        const numKeys = stack.numKeys
        const thisName = sortKeysUtils.getPropertyName(node)
        const isBlankLineBetweenNodes =
          stack.prevBlankLine || (allowLineSeparatedGroups && sortKeysUtils.hasBlankLineBetweenNodes(context, node, prevNode))

        stack.prevNode = node
        stack.prevNameSkipped = thisName === null

        if (thisName !== null) {
          stack.prevName = thisName
        }

        if (allowLineSeparatedGroups && isBlankLineBetweenNodes) {
          stack.prevBlankLine = thisName === null
          return
        }

        if (prevName === null || thisName === null || numKeys < minKeys) {
          return
        }

        const isValidOverride = stack.isValidOrderOverride && stack.isValidOrderOverride(prevName, thisName)

        if (isValidOverride === false) {
          reportUtils.createReport(context, node, prevNode, fixable, 'sortKeysOverride', {
            thisName,
            prevName,
            parentName: stack.parentName || '',
            overrideMessage: stack.override.message,
          })
          return
        }

        if (isValidOverride) {
          return
        }

        const isValidAllCaps = isValidOrderAllCaps(prevName, thisName)

        if (isValidAllCaps === false) {
          reportUtils.createReport(context, node, prevNode, fixable, 'sortKeysAllCaps', {
            thisName,
            prevName,
            allCaps,
          })
          return
        }

        const isValidShorthand = isValidOrderShorthand(prevNode, node)

        if (isValidShorthand === false) {
          reportUtils.createReport(context, node, prevNode, fixable, 'sortKeysShorthand', {
            thisName,
            prevName,
            shorthand,
          })
          return
        }

        if (isValidAllCaps || isValidShorthand) {
          return
        }

        if (!isValidOrderAlpha(prevName, thisName)) {
          reportUtils.createReport(context, node, prevNode, fixable, 'sortKeys', {
            thisName,
            prevName,
            order,
            insensitive: insensitive ? 'insensitive ' : '',
            natural: natural ? 'natural ' : '',
          })
        }
      },
    }
  },
}
