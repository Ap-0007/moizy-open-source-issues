const assert = require('node:assert/strict');
const { test } = require('node:test');
const createFocusTrap = require('../utils/focusTrap');

// Minimal fake DOM: the repo has no jsdom, so we avoid adding a dependency
function createFakeDocument() {
  return {
    activeElement: null,
    listeners: [],
    addEventListener(type, handler) {
      this.listeners.push({ type, handler });
    },
    removeEventListener(type, handler) {
      this.listeners = this.listeners.filter(
        (listener) => !(listener.type === type && listener.handler === handler)
      );
    },
    // Simulates a key press and returns the event so tests can check preventDefault
    pressKey(key, { shift = false } = {}) {
      const event = {
        key,
        shiftKey: shift,
        defaultPrevented: false,
        preventDefault() {
          this.defaultPrevented = true;
        }
      };
      this.listeners
        .filter((listener) => listener.type === 'keydown')
        .forEach((listener) => listener.handler(event));
      return event;
    }
  };
}

function createElement(doc, tagName, attrs = {}) {
  const element = {
    tagName: tagName.toUpperCase(),
    disabled: Boolean(attrs.disabled),
    hidden: Boolean(attrs.hidden),
    getAttribute: (name) => (name in attrs ? String(attrs[name]) : null),
    focus: () => {
      doc.activeElement = element;
    }
  };
  return element;
}

const FOCUSABLE_TAGS = ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];

// Mimics what the real selector in focusTrap.js would match
function matchesFocusableSelector(element) {
  return (
    FOCUSABLE_TAGS.includes(element.tagName) ||
    (element.tagName === 'A' && element.getAttribute('href') !== null) ||
    element.getAttribute('tabindex') !== null
  );
}

function createContainer(doc, children) {
  return {
    ownerDocument: doc,
    querySelectorAll: () => children.filter(matchesFocusableSelector),
    contains: (element) => children.includes(element)
  };
}

// specs is a list of [tagName, attributes] pairs, in DOM order
function setup(specs, options) {
  const doc = createFakeDocument();
  const elements = specs.map(([tagName, attrs]) => createElement(doc, tagName, attrs));
  const container = createContainer(doc, elements);
  const trap = createFocusTrap(container, options);
  return { doc, elements, trap };
}

test('detects focusable elements and skips non-focusable ones', () => {
  // A div and an anchor without href are not focusable
  const { doc, elements, trap } = setup([['div'], ['a'], ['a', { href: '#' }], ['button']]);
  trap.activate();
  assert.equal(doc.activeElement, elements[2]);
});

test('activate focuses the first element and starts listening for Tab', () => {
  const { doc, elements, trap } = setup([['button'], ['input'], ['button']]);
  trap.activate();
  assert.equal(doc.activeElement, elements[0]);
  assert.equal(doc.listeners.length, 1);
});

test('deactivate stops trapping Tab', () => {
  const { doc, elements, trap } = setup([['button'], ['button']]);
  trap.activate();
  trap.deactivate();

  elements[1].focus();
  const event = doc.pressKey('Tab');
  assert.equal(event.defaultPrevented, false);
  assert.equal(doc.activeElement, elements[1]);
});

test('Tab from the last element wraps focus to the first', () => {
  const { doc, elements, trap } = setup([['button'], ['input'], ['button']]);
  trap.activate();
  elements[2].focus();

  const event = doc.pressKey('Tab');
  assert.equal(event.defaultPrevented, true);
  assert.equal(doc.activeElement, elements[0]);
});

test('Tab from a middle element is left to the browser', () => {
  const { doc, elements, trap } = setup([['button'], ['input'], ['button']]);
  trap.activate();
  elements[1].focus();

  const event = doc.pressKey('Tab');
  assert.equal(event.defaultPrevented, false);
  assert.equal(doc.activeElement, elements[1]);
});

test('Shift + Tab from the first element wraps focus to the last', () => {
  const { doc, elements, trap } = setup([['button'], ['input'], ['button']]);
  trap.activate();

  const event = doc.pressKey('Tab', { shift: true });
  assert.equal(event.defaultPrevented, true);
  assert.equal(doc.activeElement, elements[2]);
});

test('Shift + Tab from a middle element is left to the browser', () => {
  const { doc, elements, trap } = setup([['button'], ['input'], ['button']]);
  trap.activate();
  elements[1].focus();

  const event = doc.pressKey('Tab', { shift: true });
  assert.equal(event.defaultPrevented, false);
  assert.equal(doc.activeElement, elements[1]);
});

test('container with one focusable element keeps focus on it', () => {
  const { doc, elements, trap } = setup([['div'], ['button']]);
  trap.activate();

  assert.equal(doc.pressKey('Tab').defaultPrevented, true);
  assert.equal(doc.activeElement, elements[1]);

  assert.equal(doc.pressKey('Tab', { shift: true }).defaultPrevented, true);
  assert.equal(doc.activeElement, elements[1]);
});

test('container with no focusable elements does not throw and blocks Tab', () => {
  const { doc, trap } = setup([['div'], ['a']]);
  assert.doesNotThrow(() => trap.activate());

  assert.equal(doc.pressKey('Tab').defaultPrevented, true);
  assert.equal(doc.pressKey('Tab', { shift: true }).defaultPrevented, true);
  assert.doesNotThrow(() => trap.deactivate());
});

test('keys other than Tab are ignored', () => {
  const { doc, trap } = setup([['button']]);
  trap.activate();
  assert.equal(doc.pressKey('Enter').defaultPrevented, false);
});

test('disabled elements are ignored', () => {
  const { doc, elements, trap } = setup([
    ['button', { disabled: true }],
    ['button'],
    ['button', { disabled: true }]
  ]);
  trap.activate();
  assert.equal(doc.activeElement, elements[1]);

  // The only enabled button is both first and last, so Tab stays on it
  assert.equal(doc.pressKey('Tab').defaultPrevented, true);
  assert.equal(doc.activeElement, elements[1]);
});

test('hidden inputs and hidden elements are ignored', () => {
  const { doc, elements, trap } = setup([
    ['input', { type: 'hidden' }],
    ['button', { hidden: true }],
    ['input', { type: 'text' }]
  ]);
  trap.activate();
  assert.equal(doc.activeElement, elements[2]);
});

test('follows tabindex order and skips tabindex="-1"', () => {
  const { doc, elements, trap } = setup([
    ['button'],
    ['div', { tabindex: 0 }],
    ['div', { tabindex: 2 }],
    ['div', { tabindex: 1 }],
    ['div', { tabindex: -1 }]
  ]);
  // Tab order: tabindex 1, tabindex 2, then DOM order (button, tabindex 0)
  trap.activate();
  assert.equal(doc.activeElement, elements[3]);

  // Tab from the last element (tabindex 0) wraps to the first (tabindex 1)
  elements[1].focus();
  doc.pressKey('Tab');
  assert.equal(doc.activeElement, elements[3]);

  // Shift + Tab from the first element wraps to the last
  doc.pressKey('Tab', { shift: true });
  assert.equal(doc.activeElement, elements[1]);
});

test('Tab pulls focus back in when it is outside the container', () => {
  const { doc, elements, trap } = setup([['button'], ['button']]);
  const outside = createElement(doc, 'button');
  trap.activate();
  outside.focus();

  const event = doc.pressKey('Tab');
  assert.equal(event.defaultPrevented, true);
  assert.equal(doc.activeElement, elements[0]);
});

test('repeated activation adds only one listener', () => {
  const { doc, trap } = setup([['button']]);
  trap.activate();
  trap.activate();
  assert.equal(doc.listeners.length, 1);
});

test('repeated deactivation is safe', () => {
  const { doc, trap } = setup([['button']]);
  trap.deactivate(); // before any activation
  trap.activate();
  trap.deactivate();
  assert.doesNotThrow(() => trap.deactivate());
  assert.equal(doc.listeners.length, 0);
});

test('deactivate removes the listener and the trap can be activated again', () => {
  const { doc, elements, trap } = setup([['button'], ['button']]);
  trap.activate();
  trap.deactivate();
  assert.equal(doc.listeners.length, 0);

  trap.activate();
  assert.equal(doc.listeners.length, 1);
  elements[1].focus();
  doc.pressKey('Tab');
  assert.equal(doc.activeElement, elements[0]);
});

test('deactivate restores the previously focused element', () => {
  const { doc, trap } = setup([['button'], ['button']]);
  const opener = createElement(doc, 'button');
  opener.focus();

  trap.activate();
  assert.notEqual(doc.activeElement, opener);

  trap.deactivate();
  assert.equal(doc.activeElement, opener);
});

test('repeated activation keeps the original previously focused element', () => {
  const { doc, trap } = setup([['button']]);
  const opener = createElement(doc, 'button');
  opener.focus();

  trap.activate();
  trap.activate();
  trap.deactivate();
  assert.equal(doc.activeElement, opener);
});

test('restoreFocus: false leaves focus where it is on deactivate', () => {
  const { doc, elements, trap } = setup([['button']], { restoreFocus: false });
  const opener = createElement(doc, 'button');
  opener.focus();

  trap.activate();
  trap.deactivate();
  assert.equal(doc.activeElement, elements[0]);
});