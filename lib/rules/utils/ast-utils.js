/**
 * @fileoverview Common utils for AST.
 * @author Gyandeep Singh
 */

'use strict'

//------------------------------------------------------------------------------
// Typedefs
//------------------------------------------------------------------------------

/** @typedef {import('../../shared/types').ExclusifyUnion<import('estree').Node>} ASTNode */
/** @typedef {import('estree').Comment & { type: 'Block'}} Block */
/** @typedef {import('estree').Comment & { type: 'Line'}} Line */
/** @typedef {import('eslint').AST.SourceLocation} SourceLocation */
/** @typedef {import('eslint').AST.Token} Token */
/** @typedef {import('eslint').Scope.Reference} Reference */
/** @typedef {import('eslint').Scope.Scope} Scope */
/** @typedef {import('eslint').SourceCode} SourceCode */
/** @typedef {number} int */

/**
 * Determines whether the given node is a `null` literal.
 * @param {ASTNode} node The node to check
 * @returns {boolean} `true` if the node is a `null` literal
 */
function isNullLiteral(node) {
  /*
   * Checking `node.value === null` does not guarantee that a literal is a null literal.
   * When parsing values that cannot be represented in the current environment (e.g. unicode
   * regexes in Node 4), `node.value` is set to `null` because it wouldn't be possible to
   * set `node.value` to a unicode regex. To make sure a literal is actually `null`, check
   * `node.regex` instead. Also see: https://github.com/eslint/eslint/issues/8020
   */
  return node.type === 'Literal' && node.value === null && !node.regex && !node.bigint
}

/**
 * Returns the result of the string conversion applied to the evaluated value of the given expression node,
 * if it can be determined statically.
 *
 * This function returns a `string` value for all `Literal` nodes and simple `TemplateLiteral` nodes only.
 * In all other cases, this function returns `null`.
 * @param {ASTNode} node Expression node.
 * @returns {string|null} String value if it can be determined. Otherwise, `null`.
 */
function getStaticStringValue(node) {
  switch (node.type) {
    case 'Literal':
      if (node.value === null) {
        if (isNullLiteral(node)) {
          return String(node.value) // "null"
        }
        if (node.regex) {
          return `/${node.regex.pattern}/${node.regex.flags}`
        }
        if (node.bigint) {
          return node.bigint
        }

        // Otherwise, this is an unknown literal. The function will return null.
      } else {
        return String(node.value)
      }
      break
    case 'TemplateLiteral':
      if (node.expressions.length === 0 && node.quasis.length === 1) {
        return node.quasis[0].value.cooked
      }
      break

    // no default
  }

  return null
}

/**
 * Gets the property name of a given node.
 * The node can be a MemberExpression, a Property, or a MethodDefinition.
 *
 * If the name is dynamic, this returns `null`.
 *
 * For examples:
 *
 *     a.b           // => "b"
 *     a["b"]        // => "b"
 *     a['b']        // => "b"
 *     a[`b`]        // => "b"
 *     a[100]        // => "100"
 *     a[b]          // => null
 *     a["a" + "b"]  // => null
 *     a[tag`b`]     // => null
 *     a[`${b}`]     // => null
 *
 *     let a = {b: 1}            // => "b"
 *     let a = {["b"]: 1}        // => "b"
 *     let a = {['b']: 1}        // => "b"
 *     let a = {[`b`]: 1}        // => "b"
 *     let a = {[100]: 1}        // => "100"
 *     let a = {[b]: 1}          // => null
 *     let a = {["a" + "b"]: 1}  // => null
 *     let a = {[tag`b`]: 1}     // => null
 *     let a = {[`${b}`]: 1}     // => null
 * @param {ASTNode} node The node to get.
 * @returns {string|null} The property name if static. Otherwise, null.
 */
function getStaticPropertyName(node) {
  let prop

  switch (node && node.type) {
    case 'ChainExpression':
      return getStaticPropertyName(node.expression)

    case 'Property':
    case 'PropertyDefinition':
    case 'MethodDefinition':
      prop = node.key
      break

    case 'MemberExpression':
      prop = node.property
      break

    // no default
  }

  if (prop) {
    if (prop.type === 'Identifier' && !node.computed) {
      return prop.name
    }

    return getStaticStringValue(prop)
  }

  return null
}

//------------------------------------------------------------------------------
// Public Interface
//------------------------------------------------------------------------------

module.exports = {
  isNullLiteral,
  getStaticStringValue,
  getStaticPropertyName,
}
