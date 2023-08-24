'use strict';

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

module.exports = {
  combination,
}
