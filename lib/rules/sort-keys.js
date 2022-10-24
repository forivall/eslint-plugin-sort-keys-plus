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

/** @typedef {import('../shared/types').ExclusifyUnion<import('estree').Node>} ASTNode */
/** @typedef {import('../shared/types').ExclusifyUnion<ASTNode['key']>} ASTPropKeyNode */
/**
 * @typedef Override
 * @property {string} [message] Message
 * @property {string[]} order Property Order
 * @property {string[]} [properties] Name of parent property to apply this override to. If omitted, the object's keys
 *                                   must be a total subset of the properties defined in order
 */
/**
 * @typedef Options
 * @property {boolean} [caseSensitive] Use case sensitive sorting
 * @property {boolean} [natural] Use natural sorting
 * @property {number} [minKeys] Minimum Keys
 * @property {boolean} [allowLineSeparatedGroups] Allow Line Separated Groups
 * @property {boolean} [ignoreSingleLine] Ignore Single Line
 * @property {'first' | 'last' | 'ignore'} [allCaps] All Caps option
 * @property {'first' | 'last' | 'ignore'} [shorthand] shorthand option
 * @property {Override[]} [overrides] Overrides options
 */
/**
 * @template {string} T
 * @typedef {(a: T, b: T) => boolean | null} IsValidOrder
 */
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
 * @property {Override} override
 * @property {IsValidOrder} isValidOrder
 */

/**
 * Combinatorial combination fn
 * @template T
 * @param {T[]} arr items
 * @param {number} minLength minimum length
 * @returns {T[][]} combinations
 */
function combination(arr, minLength) {
  /** @type {T[][]} */
  const initialValue = []

  return arr
    .reduce((out, item) => [...out, [item], ...out.map(c => [...c, item])], initialValue)
    .filter(c => c.length >= minLength)
}

/**
 * Gets the property name of the given `Property` node.
 *
 * - If the property's key is an `Identifier` node, this returns the key's name
 *   whether it's a computed property or not.
 * - If the property has a static name, this returns the static name.
 * - Otherwise, this returns null.
 * @param {ASTNode} node The `Property` node to get.
 * @returns {string|null} The property name or null.
 * @private
 */
function getPropertyName(node) {
  const staticName = astUtils.getStaticPropertyName(node)

  if (staticName !== null) {
    return staticName
  }

  /** @type {ASTPropKeyNode | undefined} */
  const key = node.key

  return (key && key.name) || null
}

/**
 * test blank lines
 * @param {import('eslint').Rule.RuleContext} context context
 * @param {import('eslint').Rule.Node} node node
 * @param {import('eslint').Rule.Node} prevNode prevNode
 * @returns {boolean} if there is a blank line between the prevNode and current node
 */
function hasBlankLineBetweenNodes(context, node, prevNode) {
  const sourceCode = context.getSourceCode()

  // Get tokens between current node and previous node
  const tokens = prevNode && sourceCode.getTokensBetween(prevNode, node, { includeComments: true })

  if (!tokens) {
    return false
  }
  let previousToken

  // check blank line between tokens
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]

    if (previousToken && token.loc.start.line - previousToken.loc.end.line > 1) {
      return true
    }
    previousToken = token
  }

  // check blank line between the current node and the last token
  if (node.loc.start.line - tokens[tokens.length - 1].loc.end.line > 1) {
    return true
  }

  // check blank line between the first token and the previous node
  if (tokens[0].loc.start.line - prevNode.loc.end.line > 1) {
    return true
  }
  return false
}

/**
 * Function to check that 2 names are proper all caps order
 * @param {string} a first value
 * @param {string} b second value
 * @returns {boolean | null} if the values are in valid order; null if both are all caps or both not all caps
 * @private
 */
function isValidAllCapsTest(a, b) {
  const aIsAllCaps = a === a.toUpperCase()
  const bIsAllCaps = b === b.toUpperCase()

  return aIsAllCaps === bIsAllCaps ? null : aIsAllCaps && !bIsAllCaps
}

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

/**
 * reverse order function
 * @template T
 * @param {IsValidOrder<T>} isValidOrder order function
 * @returns {IsValidOrder<T>} reversed order function
 */
const reverseOrder = isValidOrder => (a, b) => isValidOrder(b, a) // eslint-disable-line func-style

const returnNull = () => null // eslint-disable-line func-style

/**
 * transform test
 * @template T
 * @param {'ignore' | 'first' | 'last'} option Option value
 * @param {IsValidOrder<T>} isValidOrder base test
 * @returns {IsValidOrder<T>} new test
 */
function firstLastTest(option, isValidOrder) {
  switch (option) {
    case 'first':
      return isValidOrder
    case 'last':
      return reverseOrder(isValidOrder)
    default:
      return returnNull
  }
}

/**
 * Functions which check that the given 2 names are in specific order.
 *
 * Postfix `I` is meant insensitive.
 * Postfix `N` is meant natural.
 * @type {Record<`${'asc'|'desc'}${''|'I'}${''|'N'}`, IsValidOrder>}
 * @private
 */
// @ts-ignore
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
}

Object.keys(isValidOrders).forEach(asc => {
  const desc = `desc${asc.slice(3)}`

  isValidOrders[desc] = Object.defineProperty(reverseOrder(isValidOrders[asc]), 'name', { value: desc })
})

/**
 * Customize
 * @param {(a: any, b: any) => boolean} base isValid checker
 * @param {string[]} [order] order of properties
 * @returns {(a: any, b: any) => boolean} new comparator
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

/**
 * create fixer
 * @param {import('eslint').Rule.RuleContext} context context
 * @param {import('eslint').Rule.Node} node node
 * @param {import('eslint').Rule.Node} prevNode prevNode
 * @returns {import('eslint').Rule.ReportFixer} fixer
 */
function createFixer(context, node, prevNode) {
  return function fix(fixer) {
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
    },
  },

  create(context) {
    // Parse options.
    /** @type {'asc' | 'desc'} */
    const order = context.options[0] || 'asc'
    /** @type {Options | undefined} */
    const options = context.options[1]
    const insensitive = options && options.caseSensitive === false
    const natural = options && options.natural
    const minKeys = (options && options.minKeys) || 2
    const allowLineSeparatedGroups = (options && options.allowLineSeparatedGroups) || false
    const ignoreSingleLine = (options && options.ignoreSingleLine) || false
    const allCaps = (options && options.allCaps) || 'ignore'
    const shorthand = (options && options.shorthand) || 'ignore'
    /** @type {Override[]} */
    const overrides = (options && options.overrides) || []
    /** @type {Map<string | undefined, Override>} */
    const propOverrides = new Map(
      overrides.flatMap(item => (item.properties ? item.properties.map(property => [property, item]) : [])),
    )
    /** @type {Map<string, Override>} */
    const otherOverrides = new Map()

    overrides.forEach(override => {
      if (override.properties) {
        return
      }

      const sorted = override.order.concat().sort()

      combination(sorted, minKeys).forEach(combo => {
        const key = combo.join()
        const existing = otherOverrides.get(key)

        if (!existing || override.order.length < existing.order.length) {
          otherOverrides.set(key, override)
        }
      })
    })
    const isValidOrderBase = isValidOrders[`${order}${insensitive ? 'I' : ''}${natural ? 'N' : ''}`]
    const isValidOrderAllCaps = firstLastTest(allCaps, isValidAllCapsTest)
    const isValidOrderShorthand = firstLastTest(shorthand, isValidShorthandTest)

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
          /** @type {ASTPropKeyNode} */
          const parentKey = parent.key

          parentName = typeof parentKey.value === 'string' ? parentKey.value : parentKey.name
          override = propOverrides.get(parentName)
        }
        if (!override && otherOverrides.size > 0) {
          const key = node.properties
            .map(getPropertyName)
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
          isValidOrder: customizeOrder(isValidOrderBase, override && override.order),
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
        const numKeys = stack.numKeys
        const thisName = getPropertyName(node)
        const isBlankLineBetweenNodes =
          stack.prevBlankLine || (allowLineSeparatedGroups && hasBlankLineBetweenNodes(context, node, prevNode))

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

        const isValidAllCaps = isValidOrderAllCaps(prevName, thisName)

        if (isValidAllCaps === false) {
          /** @type {import('eslint').Rule.ReportDescriptor} */
          const report = {
            node,
            loc: node.key.loc,
            message: `Expected all caps keys to be {{allCaps}}. '{{thisName}}' should be before '{{prevName}}'.`,
            data: {
              thisName,
              prevName,
              allCaps,
            },
          }

          if (!prevNameSkipped) {
            report.fix = createFixer(context, node, prevNode)
          }
          context.report(report)
          return
        }

        const isValidShorthand = isValidOrderShorthand(prevNode, node)

        if (isValidShorthand === false) {
          /** @type {import('eslint').Rule.ReportDescriptor} */
          const report = {
            node,
            loc: node.key.loc,
            message: `Expected shorthand properties to be {{shorthand}}. '{{thisName}}' should be before '{{prevName}}'.`,
            data: {
              thisName,
              prevName,
              shorthand,
            },
          }

          if (!prevNameSkipped) {
            report.fix = createFixer(context, node, prevNode)
          }
          context.report(report)
          return
        }

        if (isValidAllCaps || isValidShorthand) {
          return
        }

        if (!stack.isValidOrder(prevName, thisName)) {
          const isOverride =
            stack.override &&
            (stack.override.order.indexOf(prevName) >= 0 || stack.override.order.indexOf(thisName) >= 0)

          const messageStart = isOverride
            ? stack.override.message || 'Expected object keys of {{parentName}} to be in custom order.'
            : 'Expected object keys to be in {{natural}}{{insensitive}}{{order}}ending order.'

          /** @type {import('eslint').Rule.ReportDescriptor} */
          const report = {
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
          }

          if (!prevNameSkipped) {
            report.fix = createFixer(context, node, prevNode)
          }

          context.report(report)
        }
      },
    }
  },
}
