/**
 * Converts a JavaScript object into a properly encoded URL query string.
 *
 * **How it handles data:**
 * - **Encoding:** Keys and values are safely encoded using `encodeURIComponent` (spaces become `%20`). Do not pass already-encoded strings, or they will be double-encoded.
 * - **Arrays:** Repeats the key for each item in the array (e.g., `{ tags: ['a', 'b'] }` becomes `tags=a&tags=b`). Empty arrays are ignored.
 * - **Missing values:** `null` and `undefined` are completely skipped, both as direct values and inside arrays.
 * - **Empty strings:** Included with an equal sign but no value (e.g., `key=`).
 *
 * **Safety & Ordering:**
 * The original object is never mutated. Parameters are ordered exactly as they appear in `Object.entries()`.
 *
 * @param {Object<string, string|number|boolean|null|undefined|Array<string|number|boolean|null|undefined>>} params
 *   A plain JavaScript object containing the query parameters.
 * @returns {string} The formatted query string joined by `&`, or an empty string if no valid parameters exist.
 * @throws {TypeError} If the input is not a plain object, or if it contains unsupported types like nested objects, multi-dimensional arrays, or non-finite numbers.
 * @throws {URIError} If a key or value contains an unpaired Unicode surrogate.
 *
 * @example
 * const query = buildQueryString({ search: 'running shoes', tags: ['node', 'api'], page: 2 });
 * // Returns: 'search=running%20shoes&tags=node&tags=api&page=2'
 */

function buildQueryString(params) {
  if (
    params === null ||
    typeof params !== 'object' ||
    (Object.getPrototypeOf(params) !== Object.prototype &&
      Object.getPrototypeOf(params) !== null)
  ) {
    throw new TypeError('Expected a plain object');
  }

  const pairs = [];

  for (const [key, value] of Object.entries(params)) {
    const values = Array.isArray(value) ? value : [value];
    const encodedKey = encodeURIComponent(key);

    for (const item of values) {
      if (item === null || item === undefined) {
        continue;
      }

      if (
        !['string', 'number', 'boolean'].includes(typeof item) ||
        (typeof item === 'number' && !Number.isFinite(item))
      ) {
        throw new TypeError('Expected a string, finite number, or boolean');
      }

      pairs.push(`${encodedKey}=${encodeURIComponent(String(item))}`);
    }
  }

  return pairs.join('&');
}

module.exports = buildQueryString;