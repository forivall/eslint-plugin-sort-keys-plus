/**
 * @fileoverview Rule to require object keys to be sorted
 * @author Toru Nagashima
 */

'use strict'

// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

const astUtils = require('./utils/ast-utils'),
  naturalCompare = require('natural-compare')

// ------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------

/**
 * Gets the property name of the given `Property` node.
 *
 * - If the property's key is an `Identifier` node, this returns the key's name
 *   whether it's a computed property or not.
 * - If the property has a static name, this returns the static name.
 * - Otherwise, this returns null.
 * @param {import('../shared/types').ExclusifyUnion<import('eslint').Rule.Node>} node The `Property` node to get.
 * @returns {string|null} The property name or null.
 * @private
 */
function getPropertyName(node) {
  const staticName = astUtils.getStaticPropertyName(node)

  if (staticName !== null) {
    return staticName
  }

  return node.key.name || null
}

/**
 * Functions which check that the given 2 names are in specific order.
 *
 * Postfix `I` is meant insensitive.
 * Postfix `N` is meant natural.
 * @private
 */
const isValidOrders = {
  asc(a, b) {
    return a <= b
  },
  ascI(a, b) {
    return a.toLowerCase() <= b.toLowerCase()
  },
  ascN(a, b) {
    return naturalCompare(a, b) <= 0
  },
  ascIN(a, b) {
    return naturalCompare(a.toLowerCase(), b.toLowerCase()) <= 0
  },
  desc(a, b) {
    return isValidOrders.asc(b, a)
  },
  descI(a, b) {
    return isValidOrders.ascI(b, a)
  },
  descN(a, b) {
    return isValidOrders.ascN(b, a)
  },
  descIN(a, b) {
    return isValidOrders.ascIN(b, a)
  },
}

/**
 * Customize
 * @param {(a: any, b: any) => boolean} base
 * @param {string[]=} order
 * @returns {(a: any, b: any) => boolean}
 */
function customizeOrder(base, order) {
  if (!order) {
    return base
  }
  return (a, b) => {
    const aIndex = order.indexOf(a)
    const bIndex = order.indexOf(b)

    if (aIndex >= 0) {
      if (bIndex >= 0) {
        return aIndex <= bIndex
      }
      return true
    }
    return bIndex < 0 && base(a, b)
  }
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
      url: 'https://github.com/forivall/eslint-plugin-sort-keys-plus',
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
          overrides: {
            type: 'array',
            items: {
              type: 'object',
              required: ['order', 'properties'],
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
    },
  },

  create(context) {
    // Parse options.
    const order = context.options[0] || 'asc'
    const options = context.options[1]
    const insensitive = options && options.caseSensitive === false
    const natural = options && options.natural
    const minKeys = options && options.minKeys
    const overrides = (options && options.overrides) || []
    const overridesMap = new Map(overrides.flatMap(item => item.properties.map(property => [property, item])))
    const isValidOrderBase = isValidOrders[order + (insensitive ? 'I' : '') + (natural ? 'N' : '')]

    // The stack to save the previous property's name for each object literals.
    let stack = null

    /**
     * Spread element parser
     * @param {import('estree').SpreadElement & import('eslint').Rule.NodeParentExtension} node AST Node
     * @returns {void}
     */
    function SpreadElement(node) {
      if (node.parent.type === 'ObjectExpression') {
        stack.prevName = null
        stack.prevNode = null
      }
    }

    return {
      ExperimentalSpreadProperty: SpreadElement,

      ObjectExpression(node) {
        const parent = node.parent
        let parentName
        let override

        if (parent.type === 'Property' && !parent.computed) {
          parentName = typeof parent.key.value === 'string' ? parent.key.value : parent.key.name
          override = overridesMap.get(parentName)
        }

        stack = {
          upper: stack,
          prevName: null,
          prevNode: null,
          numKeys: node.properties.length,
          parentName,
          override,
          isValidOrder: customizeOrder(isValidOrderBase, override && override.order),
        }
      },

      'ObjectExpression:exit'() {
        stack = stack.upper
      },

      SpreadElement,

      Property(node) {
        if (node.parent.type === 'ObjectPattern') {
          return
        }

        const prevName = stack.prevName
        const prevNode = stack.prevNode
        const numKeys = stack.numKeys
        const thisName = getPropertyName(node)

        if (thisName !== null) {
          stack.prevName = thisName
          stack.prevNode = node || prevNode
        }

        if (prevName === null || thisName === null || numKeys < minKeys) {
          return
        }

        if (!stack.isValidOrder(prevName, thisName)) {
          const isOverride =
            stack.override &&
            (stack.override.order.indexOf(prevName) >= 0 || stack.override.order.indexOf(thisName) >= 0)

          const messageStart = isOverride
            ? stack.override.message || 'Expected object keys of {{parentName}} to be in custom order.'
            : 'Expected object keys to be in {{natural}}{{insensitive}}{{order}}ending order.'

          context.report({
            node,
            loc: node.key.loc,
            message: `${messageStart} '{{thisName}}' should be before '{{prevName}}'.`,
            data: {
              parentName: stack.parentName,
              thisName,
              prevName,
              order,
              insensitive: insensitive ? 'insensitive ' : '',
              natural: natural ? 'natural ' : '',
            },
            fix(fixer) {
              const fixes = []
              const sourceCode = context.getSourceCode()

              /**
               * Move Property
               * @param {import('eslint').Rule.Node} fromNode From Node
               * @param {import('eslint').Rule.Node} toNode To Node
               * @returns {void}
               */
              function moveProperty(fromNode, toNode) {
                const prevText = sourceCode.getText(fromNode)
                const thisComments = sourceCode.getCommentsBefore(fromNode)

                for (const thisComment of thisComments) {
                  fixes.push(fixer.insertTextBefore(toNode, `${sourceCode.getText(thisComment)}\n`))
                  fixes.push(fixer.remove(thisComment))
                }
                fixes.push(fixer.replaceText(toNode, prevText))
              }

              moveProperty(node, prevNode)
              moveProperty(prevNode, node)
              return fixes
            },
          })
        }
      },
    }
  },
}
