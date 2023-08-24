'use strict'

/**
 * create fixer
 * @param {import('eslint').Rule.RuleContext} context context
 * @param {import('eslint').Rule.Node} node node
 * @param {import('eslint').Rule.Node} prevNode prevNode
 * @returns {import('eslint').Rule.ReportFixer} fixer
 */
function createFixer(context, node, prevNode) {
  return function fix(fixer) {
    /** @type {import('eslint').Rule.Fix[]} */
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

/**
 * create report
 * @param {import('eslint').Rule.RuleContext} context context
 * @param {import('estree').Property} node node
 * @param {import('estree').Property} prevNode previous node
 * @param {boolean} fixable create fixer
 * @param {string} messageId message id
 * @param {{thisName: string, prevName: string, overrideMessage?: string, [key: string]: any}} data message data
 * @returns {void}
 */
function createReport(context, node, prevNode, fixable, messageId, data) {
  const reportMessage = data.overrideMessage
    ? { message: `${data.overrideMessage} '{{thisName}}' should be before '{{prevName}}'.` }
    : { messageId }
  /** @type {import('eslint').Rule.ReportDescriptor} */
  const report = {
    node,
    loc: node.key.loc,
    ...reportMessage,
    data,
  }

  if (fixable) {
    report.fix = createFixer(context, node, prevNode)
  }
  context.report(report)
}

module.exports = {
  createFixer,
  createReport,
}
