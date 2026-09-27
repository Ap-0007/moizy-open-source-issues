/**
 * detectConfigDrift
 *
 * Compares two configuration objects and reports their differences.
 *
 * @param {object} base - The reference configuration (e.g. staging).
 * @param {object} target - The configuration to compare against (e.g. production).
 * @param {object} [options] - Optional settings.
 * @param {string[]} [options.ignore] - Property paths to ignore (e.g. ["buildId"]).
 * @returns {{ hasDrift: boolean, added: string[], removed: string[], changed: Array<{key: string, from: any, to: any}> }}
 *
 * @example
 * detectConfigDrift(
 *   { apiUrl: "https://staging.example.com", timeout: 5000, featureX: true },
 *   { apiUrl: "https://api.example.com", timeout: 3000 }
 * );
 * // {
 * //   hasDrift: true,
 * //   added: [],
 * //   removed: ["featureX"],
 * //   changed: [{ key: "apiUrl", from: "...", to: "..." },
 * //             { key: "timeout", from: 5000, to: 3000 }]
 * // }
 */
function detectConfigDrift(base, target, options = {}) {
  const ignore = new Set(options.ignore || []);
  const added = [];
  const removed = [];
  const changed = [];

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function walk(a, b, path) {
    const keysA = isObject(a) ? Object.keys(a) : [];
    const keysB = isObject(b) ? Object.keys(b) : [];

    const allKeys = new Set([...keysA, ...keysB]);

    for (const key of allKeys) {
      const fullPath = path ? `${path}.${key}` : key;
      if (ignore.has(fullPath) || ignore.has(key)) continue;

      const inA = Object.prototype.hasOwnProperty.call(a, key);
      const inB = Object.prototype.hasOwnProperty.call(b, key);
      const valA = inA ? a[key] : undefined;
      const valB = inB ? b[key] : undefined;

      if (!inB) {
        removed.push(fullPath);
      } else if (!inA) {
        added.push(fullPath);
      } else if (isObject(valA) && isObject(valB)) {
        walk(valA, valB, fullPath);
      } else if (Array.isArray(valA) && Array.isArray(valB)) {
        if (JSON.stringify(valA) !== JSON.stringify(valB)) {
          changed.push({ key: fullPath, from: valA, to: valB });
        }
      } else if (valA !== valB) {
        changed.push({ key: fullPath, from: valA, to: valB });
      }
    }
  }

  if (!isObject(base) || !isObject(target)) {
    return { hasDrift: false, added: [], removed: [], changed: [] };
  }

  walk(base, target, "");

  added.sort();
  removed.sort();
  changed.sort((x, y) => x.key.localeCompare(y.key));

  return {
    hasDrift: added.length > 0 || removed.length > 0 || changed.length > 0,
    added,
    removed,
    changed,
  };
}

module.exports = { detectConfigDrift };