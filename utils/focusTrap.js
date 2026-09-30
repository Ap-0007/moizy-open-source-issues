/**
 * Creates a focus trap that keeps keyboard focus inside a container.
 * Useful for modals, drawers, command palettes and other overlays.
 * @param {HTMLElement} container - The element that should hold keyboard focus
 * @param {{ restoreFocus?: boolean }} [options] - Set restoreFocus to false to skip returning focus on deactivate
 * @returns {{ activate: Function, deactivate: Function }} - Trap controls
 */

// Elements that can normally receive keyboard focus
const FOCUSABLE_SELECTOR = [
  'button',
  'a[href]',
  'input',
  'select',
  'textarea',
  '[tabindex]'
].join(',');

// Checks that a matched element can really be reached with the Tab key
function isTabbable(element) {
  // Disabled or hidden elements never receive focus
  if (element.disabled || element.hidden) return false;

  // Hidden inputs are not focusable
  if (element.tagName === 'INPUT' && element.getAttribute('type') === 'hidden') {
    return false;
  }

  // tabindex="-1" can be focused by code, but is skipped by the Tab key
  const tabindex = element.getAttribute('tabindex');
  if (tabindex !== null && Number(tabindex) < 0) return false;

  return true;
}

// Returns all tabbable elements inside the container, in DOM order
function getFocusableElements(container) {
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(isTabbable);
}

// Orders elements the way the browser's Tab key does:
// positive tabindex values first (lowest to highest), then the rest in DOM order
function getTabOrder(container) {
  const elements = getFocusableElements(container);
  const tabindexOf = (element) => Number(element.getAttribute('tabindex')) || 0;

  const positive = elements
    .filter((element) => tabindexOf(element) > 0)
    .sort((a, b) => tabindexOf(a) - tabindexOf(b));
  const natural = elements.filter((element) => tabindexOf(element) === 0);

  return positive.concat(natural);
}

function createFocusTrap(container, options = {}) {
  if (!container || typeof container.querySelectorAll !== 'function') {
    throw new TypeError('createFocusTrap requires a DOM element');
  }

  // Restoring focus on deactivate is on by default, but can be turned off
  const { restoreFocus = true } = options;
  const doc = container.ownerDocument;

  let active = false;
  let previouslyFocused = null;

  function handleKeydown(event) {
    if (event.key !== 'Tab') return;

    const elements = getTabOrder(container);

    // Nothing to focus inside: stop Tab from moving focus behind the overlay
    if (elements.length === 0) {
      event.preventDefault();
      return;
    }

    const first = elements[0];
    const last = elements[elements.length - 1];
    const current = doc.activeElement;
    const isInside = container.contains(current);

    if (event.shiftKey) {
      // Shift + Tab from the first element (or from outside) wraps to the last
      if (current === first || !isInside) {
        event.preventDefault();
        last.focus();
      }
    } else if (current === last || !isInside) {
      // Tab from the last element (or from outside) wraps to the first
      event.preventDefault();
      first.focus();
    }
  }

  function activate() {
    // Repeated activation does nothing, so listeners are never added twice
    if (active) return;
    active = true;

    previouslyFocused = doc.activeElement;
    doc.addEventListener('keydown', handleKeydown);

    const elements = getTabOrder(container);
    if (elements.length > 0) elements[0].focus();
  }

  function deactivate() {
    // Repeated deactivation does nothing
    if (!active) return;
    active = false;

    doc.removeEventListener('keydown', handleKeydown);

    if (restoreFocus && previouslyFocused && typeof previouslyFocused.focus === 'function') {
      previouslyFocused.focus();
    }
    previouslyFocused = null;
  }

  return { activate, deactivate };
}

module.exports = createFocusTrap;