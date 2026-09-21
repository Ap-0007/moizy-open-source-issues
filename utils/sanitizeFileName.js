/**
 * Sanitizes a filename to make it safe for filesystem storage, cloud buckets, and URLs,
 * while preserving valid file extensions.
 *
 * @param {string} fileName - The filename to sanitize.
 * @param {Object} [options={}] - Configuration options.
 * @param {string} [options.replacement='-'] - Replacement character for invalid characters.
 * @param {number} [options.maxLength=255] - Maximum total filename length (including extension).
 * @param {boolean} [options.toLowerCase=true] - Whether to convert filename to lowercase.
 * @returns {string} The sanitized, safe filename.
 */
function sanitizeFileName(fileName, options = {}) {
  if (typeof fileName !== 'string' || fileName.trim().length === 0) {
    return 'unnamed-file';
  }

  const {
    replacement = '-',
    maxLength = 255,
    toLowerCase = true,
    stripPath = false,
  } = options;

  let cleanName = fileName.trim();

  if (stripPath) {
    const lastSlash = Math.max(cleanName.lastIndexOf('/'), cleanName.lastIndexOf('\\'));
    if (lastSlash >= 0) {
      cleanName = cleanName.substring(lastSlash + 1);
    }
  } else {
    // Replace slashes with replacement character
    cleanName = cleanName.replace(/[/\\]+/g, replacement);
  }

  // Handle dot sequences from traversal (e.g. ..- or .-.)
  cleanName = cleanName.replace(/^\.+/, (match) => {
    // Allow a single leading dot for hidden files if followed by an alphanumeric character
    return match === '.' && /^\.[a-zA-Z0-9]/.test(cleanName) ? '.' : '';
  });

  if (!cleanName || cleanName === '.' || cleanName === '..') {
    return 'unnamed-file';
  }

  // Separate name and extension
  let baseName = cleanName;
  let extension = '';

  const lastDotIndex = cleanName.lastIndexOf('.');
  if (lastDotIndex > 0 && lastDotIndex < cleanName.length - 1) {
    baseName = cleanName.substring(0, lastDotIndex);
    extension = cleanName.substring(lastDotIndex + 1);
  } else if (cleanName.startsWith('.') && cleanName.indexOf('.', 1) === -1) {
    baseName = cleanName;
    extension = '';
  }

  // Normalize Unicode characters to NFKD (decomposes accents/ligatures)
  baseName = baseName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');

  if (extension) {
    extension = extension
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  // Safe character regex: letters, numbers, hyphens, underscores, dots
  const escapeRegex = (s) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  const safeRepl = replacement.length > 0 ? replacement[0] : '-';

  // Replace invalid characters in baseName
  baseName = baseName.replace(/[^a-zA-Z0-9._-]+/g, safeRepl);

  // Replace invalid characters in extension
  if (extension) {
    extension = extension.replace(/[^a-zA-Z0-9_-]+/g, '');
  }

  // Collapse consecutive replacement characters and dots
  const replPattern = new RegExp(`(${escapeRegex(safeRepl)})+`, 'g');
  baseName = baseName.replace(replPattern, safeRepl);
  baseName = baseName.replace(/\.{2,}/g, '.');

  // Strip leading and trailing replacement characters and non-hidden leading dots
  const isHidden = cleanName.startsWith('.') && !cleanName.startsWith('..') && /^\.[a-zA-Z0-9]/.test(cleanName);
  baseName = baseName.replace(new RegExp(`^[${escapeRegex(safeRepl)}.]+|[${escapeRegex(safeRepl)}.]+$`, 'g'), '');
  if (isHidden) {
    baseName = '.' + baseName;
  }

  if (toLowerCase) {
    baseName = baseName.toLowerCase();
    if (extension) {
      extension = extension.toLowerCase();
    }
  }

  if (!baseName || baseName === '.') {
    baseName = 'unnamed-file';
  }

  // Combine and enforce maxLength
  let finalExtension = extension ? `.${extension}` : '';
  if (maxLength && typeof maxLength === 'number' && maxLength > 0) {
    if (finalExtension.length >= maxLength) {
      // If extension alone exceeds maxLength, truncate extension
      finalExtension = finalExtension.substring(0, maxLength);
      return finalExtension;
    }
    const maxBaseLength = maxLength - finalExtension.length;
    if (baseName.length > maxBaseLength) {
      baseName = baseName.substring(0, maxBaseLength);
      // Clean trailing separator after truncation
      baseName = baseName.replace(new RegExp(`${escapeRegex(safeRepl)}+$`), '');
      if (!baseName) baseName = 'unnamed-file'.substring(0, maxBaseLength);
    }
  }

  return `${baseName}${finalExtension}`;
}

module.exports = sanitizeFileName;
