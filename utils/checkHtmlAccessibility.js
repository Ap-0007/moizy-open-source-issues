/**
 * checkHtmlAccessibility
 *
 * Analyzes an HTML string and reports common accessibility issues.
 *
 * @param {string} html - The HTML string to analyze.
 * @param {object} [options] - Optional configuration.
 * @param {object} [options.rules] - Map of rule IDs to booleans. Set to
 *   false to disable a rule. All rules are enabled by default.
 * @returns {{ valid: boolean, errors: Array<{rule: string, line: number, message: string}> }}
 *
 * @example
 * const result = checkHtmlAccessibility('<img src="a.png">');
 * // {
 * //   valid: false,
 * //   errors: [
 * //     { rule: 'image-alt', line: 1, message: 'Image is missing an alt attribute' }
 * //   ]
 * // }
 */
function checkHtmlAccessibility(html, options = {}) {
  const enabledRules = {
    "image-alt": true,
    "form-label": true,
    "button-name": true,
    "link-name": true,
    "html-lang": true,
    "heading-order": true,
    ...(options.rules || {}),
  };

  const errors = [];

  // Safety: handle non-string or empty input
  if (typeof html !== "string" || html.trim() === "") {
    return { valid: true, errors: [] };
  }

  const lines = html.split(/\r?\n/);

  /**
   * Find the 1-based line number for a given character index.
   */
  function lineForIndex(index) {
    let count = 1;
    for (let i = 0; i < index && i < html.length; i++) {
      if (html[i] === "\n") count++;
    }
    return count;
  }

  // ---- Rule: html-lang ----
  if (enabledRules["html-lang"]) {
    const htmlTagMatch = html.match(/<html\b([^>]*)>/i);
    if (htmlTagMatch) {
      const attrs = htmlTagMatch[1];
      if (!/\blang\s*=\s*["'][^"']+["']/i.test(attrs)) {
        errors.push({
          rule: "html-lang",
          line: lineForIndex(htmlTagMatch.index),
          message: "Root <html> element is missing a lang attribute",
        });
      }
    }
  }

  // ---- Rule: image-alt ----
  if (enabledRules["image-alt"]) {
    const imgRegex = /<img\b[^>]*>/gi;
    let match;
    while ((match = imgRegex.exec(html)) !== null) {
      const tag = match[0];
      const hasAlt = /\balt\s*=\s*["'][^"']*["']/i.test(tag);
      const isDecorative = /\brole\s*=\s*["']presentation["']/i.test(tag)
        || /\baria-hidden\s*=\s*["']true["']/i.test(tag);
      if (!hasAlt && !isDecorative) {
        errors.push({
          rule: "image-alt",
          line: lineForIndex(match.index),
          message: "Image is missing an alt attribute",
        });
      }
    }
  }

  // ---- Rule: form-label ----
  if (enabledRules["form-label"]) {
    const inputRegex = /<input\b[^>]*>/gi;
    let match;
    while ((match = inputRegex.exec(html)) !== null) {
      const tag = match[0];
      const typeMatch = tag.match(/\btype\s*=\s*["']([^"']+)["']/i);
      const type = typeMatch ? typeMatch[1].toLowerCase() : "text";

      // Skip inputs that don't need labels
      if (["hidden", "submit", "button", "reset", "image"].includes(type)) continue;

      const idMatch = tag.match(/\bid\s*=\s*["']([^"']+)["']/i);
      const hasAriaLabel = /\baria-label\s*=\s*["'][^"']+["']/i.test(tag);
      const hasAriaLabelledBy = /\baria-labelledby\s*=\s*["'][^"']+["']/i.test(tag);
      const isWrapped = false; // We'd need DOM to check wrapping reliably.

      let hasLabel = hasAriaLabel || hasAriaLabelledBy;

      if (!hasLabel && idMatch) {
        const id = idMatch[1];
        const labelRegex = new RegExp(`<label\\b[^>]*\\bfor\\s*=\\s*["']${id}["']`, "i");
        if (labelRegex.test(html)) hasLabel = true;
      }

      if (!hasLabel && !isWrapped) {
        errors.push({
          rule: "form-label",
          line: lineForIndex(match.index),
          message: "Input does not have an associated label",
        });
      }
    }
  }

  // ---- Rule: button-name ----
  if (enabledRules["button-name"]) {
    const buttonRegex = /<button\b[^>]*>([\s\S]*?)<\/button>/gi;
    let match;
    while ((match = buttonRegex.exec(html)) !== null) {
      const fullTag = match[0];
      const inner = match[1];

      const hasAriaLabel = /\baria-label\s*=\s*["'][^"']+["']/i.test(fullTag);
      const hasAriaLabelledBy = /\baria-labelledby\s*=\s*["'][^"']+["']/i.test(fullTag);
      const hasTitle = /\btitle\s*=\s*["'][^"']+["']/i.test(fullTag);

      // Strip tags from inner text
      const textContent = inner.replace(/<[^>]*>/g, "").trim();

      if (!textContent && !hasAriaLabel && !hasAriaLabelledBy && !hasTitle) {
        errors.push({
          rule: "button-name",
          line: lineForIndex(match.index),
          message: "Button has no accessible name",
        });
      }
    }
  }

  // ---- Rule: link-name ----
  if (enabledRules["link-name"]) {
    const linkRegex = /<a\b[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      const fullTag = match[0];
      const inner = match[1];

      const hasAriaLabel = /\baria-label\s*=\s*["'][^"']+["']/i.test(fullTag);
      const hasAriaLabelledBy = /\baria-labelledby\s*=\s*["'][^"']+["']/i.test(fullTag);
      const hasTitle = /\btitle\s*=\s*["'][^"']+["']/i.test(fullTag);

      // Strip tags; images with alt count as content
      const innerWithAlt = inner.replace(/<img\b[^>]*\balt\s*=\s*["']([^"']+)["'][^>]*>/gi, "$1");
      const textContent = innerWithAlt.replace(/<[^>]*>/g, "").trim();

      if (!textContent && !hasAriaLabel && !hasAriaLabelledBy && !hasTitle) {
        errors.push({
          rule: "link-name",
          line: lineForIndex(match.index),
          message: "Link has no accessible name",
        });
      }
    }
  }

  // ---- Rule: heading-order ----
  if (enabledRules["heading-order"]) {
    const headingRegex = /<h([1-6])\b[^>]*>/gi;
    let match;
    let prevLevel = 0;
    while ((match = headingRegex.exec(html)) !== null) {
      const level = parseInt(match[1], 10);
      if (prevLevel !== 0 && level > prevLevel + 1) {
        errors.push({
          rule: "heading-order",
          line: lineForIndex(match.index),
          message: `Heading level skipped from h${prevLevel} to h${level}`,
        });
      }
      prevLevel = level;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = { checkHtmlAccessibility };