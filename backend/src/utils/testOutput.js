/**
 * Normalize program output and expected answers for comparison.
 * Strips whitespace and one layer of surrounding JSON-style quotes.
 * @param {unknown} value
 */
function normalizeTestOutput(value) {
  let s = String(value ?? '').trim();
  if (
    s.length >= 2
    && ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'")))
  ) {
    s = s.slice(1, -1);
  }
  return s.trim();
}

/**
 * @param {unknown} actual
 * @param {unknown} expected
 */
function outputsMatch(actual, expected) {
  return normalizeTestOutput(actual) === normalizeTestOutput(expected);
}

module.exports = { normalizeTestOutput, outputsMatch };
