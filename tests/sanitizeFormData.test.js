const { test, assert, assertEquals, printSummary } = require('./test-utils.js');
const sanitizeFormData = require('../utils/sanitizeFormData.js');

// Helper for deep equality checking
function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

test("basic string trimming", () => {
  const input = { name: "  Abdul Moeez  " };
  const output = sanitizeFormData(input);
  assertEquals(output.name, "Abdul Moeez");
});

test("multiple string fields", () => {
  const input = {
    name: "  Abdul Moeez  ",
    email: " moeez@example.com ",
    company: "  Example Ltd  "
  };
  const output = sanitizeFormData(input);
  assertEquals(output.name, "Abdul Moeez");
  assertEquals(output.email, "moeez@example.com");
  assertEquals(output.company, "Example Ltd");
});

test("internal whitespace preservation", () => {
  const input = { notes: "Hello   world   from   testing" };
  const output = sanitizeFormData(input);
  assertEquals(output.notes, "Hello   world   from   testing");
});

test("preserves empty strings by default", () => {
  const input = { empty: "", whitespace: "   " };
  const output = sanitizeFormData(input);
  assertEquals(output.empty, "");
  assertEquals(output.whitespace, "");
});

test("preserves numbers and booleans", () => {
  const input = { age: 25, active: true, count: 0, pending: false };
  const output = sanitizeFormData(input);
  assertEquals(output.age, 25);
  assertEquals(output.active, true);
  assertEquals(output.count, 0);
  assertEquals(output.pending, false);
});

test("safely handles null and undefined values", () => {
  const input = { notes: null, title: undefined };
  const output = sanitizeFormData(input);
  assertEquals(output.notes, null);
  assertEquals(output.title, undefined);
});

test("handles nested objects recursively", () => {
  const input = {
    user: {
      firstName: "  John ",
      address: {
        city: "  New York  ",
        zip: 10001
      }
    }
  };
  const output = sanitizeFormData(input);
  assertEquals(output.user.firstName, "John");
  assertEquals(output.user.address.city, "New York");
  assertEquals(output.user.address.zip, 10001);
});

test("handles arrays of strings and objects", () => {
  const input = {
    tags: ["  javascript ", " testing  ", 42],
    contacts: [{ email: " test@example.com " }]
  };
  const output = sanitizeFormData(input);
  assertEquals(output.tags[0], "javascript");
  assertEquals(output.tags[1], "testing");
  assertEquals(output.tags[2], 42);
  assertEquals(output.contacts[0].email, "test@example.com");
});

test("option: removeEmpty removes empty, whitespace-only, null, and undefined values", () => {
  const input = {
    name: "  Valid Name  ",
    empty: "   ",
    blank: "",
    notDefined: undefined,
    nil: null,
    age: 30
  };
  const output = sanitizeFormData(input, { removeEmpty: true });
  assert(deepEqual(output, { name: "Valid Name", age: 30 }), "Should only retain non-empty fields");
});

test("option: emptyToNull converts empty strings to null", () => {
  const input = {
    name: "  Valid  ",
    empty: "   ",
    alreadyNull: null
  };
  const output = sanitizeFormData(input, { emptyToNull: true });
  assertEquals(output.name, "Valid");
  assertEquals(output.empty, null);
  assertEquals(output.alreadyNull, null);
});

test("option: trimStrings=false preserves whitespace", () => {
  const input = { name: "  Leave Untrimmed  " };
  const output = sanitizeFormData(input, { trimStrings: false });
  assertEquals(output.name, "  Leave Untrimmed  ");
});

test("original object is not mutated", () => {
  const input = {
    name: "  Original  ",
    profile: { bio: "  Nested  " },
    list: ["  Item  "]
  };
  const inputCopy = JSON.parse(JSON.stringify(input));
  sanitizeFormData(input);
  assert(deepEqual(input, inputCopy), "Original object must not be mutated");
});

test("handles primitive inputs safely", () => {
  assertEquals(sanitizeFormData("  hello  "), "hello");
  assertEquals(sanitizeFormData(42), 42);
  assertEquals(sanitizeFormData(null), null);
  assertEquals(sanitizeFormData(undefined), undefined);
});

printSummary();
