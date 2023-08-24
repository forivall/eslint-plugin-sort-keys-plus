'use strict'

const astUtils = require('./ast-utils'),
  naturalCompare = require('natural-compare')

/**
 * @template [T=string]
 * @typedef {(a: T, b: T) => boolean | null} IsValidOrder
 */

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

  /** @type {ASTPropertyKeyNode | undefined} */
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
 * @param {string[]} order custom order of properties
 * @returns {IsValidOrder} comparator
 */
function validCustomOrderComparator(order) {
  return (a, b) => {
    const aIndex = order.indexOf(a)
    const bIndex = order.indexOf(b)

    if (aIndex >= 0) {
      if (bIndex >= 0) {
        return aIndex <= bIndex
      }
      return true
    }
    return bIndex < 0 && null
  }
}

module.exports = {
  getPropertyName,
  hasBlankLineBetweenNodes,
  isValidAllCapsTest,
  firstLastTest,
  isValidOrders,
  validCustomOrderComparator,
}
