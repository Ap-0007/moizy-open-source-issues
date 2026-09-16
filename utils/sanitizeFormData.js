/**
 * Form Data Sanitizer Utility
 * ----------------------------
 * Reusable utility to sanitize user-submitted form data by trimming strings,
 * handling nested structures, and providing configurable cleanup options
 * without mutating the original object.
 */

/**
 * @typedef {Object} SanitizeOptions
 * @property {boolean} [trimStrings=true] - Whether to trim leading/trailing whitespace from string values.
 * @property {boolean} [removeEmpty=false] - Whether to remove fields with empty strings, null, or undefined values.
 * @property {boolean} [emptyToNull=false] - Whether to convert empty string values ("") to null.
 */

/**
 * Sanitizes form data inputs while preserving the original input.
 *
 * @param {any} data - The form data object or value to sanitize.
 * @param {SanitizeOptions} [options={}] - Configuration options for sanitization.
 * @returns {any} A sanitized copy of the input.
 *
 * @example
 * sanitizeFormData({ name: "  Abdul Moeez  ", email: " moeez@example.com " });
 * // returns { name: "Abdul Moeez", email: "moeez@example.com" }
 *
 * @example
 * sanitizeFormData({ name: "Alice", bio: "   " }, { removeEmpty: true });
 * // returns { name: "Alice" }
 */
function sanitizeFormData(data, options = {}) {
  const {
    trimStrings = true,
    removeEmpty = false,
    emptyToNull = false,
  } = options;

  function sanitizeValue(value) {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === "string") {
      let sanitized = trimStrings ? value.trim() : value;
      if (emptyToNull && sanitized === "") {
        sanitized = null;
      }
      return sanitized;
    }

    if (Array.isArray(value)) {
      const sanitizedArray = value
        .map((item) => sanitizeValue(item))
        .filter((item) => {
          if (!removeEmpty) return true;
          return item !== "" && item !== null && item !== undefined;
        });
      return sanitizedArray;
    }

    if (typeof value === "object" && value.constructor === Object) {
      const result = {};
      for (const [key, val] of Object.entries(value)) {
        const cleaned = sanitizeValue(val);
        if (removeEmpty && (cleaned === "" || cleaned === null || cleaned === undefined)) {
          continue;
        }
        result[key] = cleaned;
      }
      return result;
    }

    // Preserve numbers, booleans, dates, symbols, etc.
    return value;
  }

  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data !== "object") {
    return sanitizeValue(data);
  }

  return sanitizeValue(data);
}

module.exports = sanitizeFormData;
