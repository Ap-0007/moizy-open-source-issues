const { detectConfigDrift } = require("../utils/detectConfigDrift");

describe("detectConfigDrift", () => {
  test("returns no drift for identical configs", () => {
    const r = detectConfigDrift({ a: 1, b: 2 }, { a: 1, b: 2 });
    expect(r.hasDrift).toBe(false);
    expect(r.added).toEqual([]);
    expect(r.removed).toEqual([]);
    expect(r.changed).toEqual([]);
  });

  test("detects added property", () => {
    const r = detectConfigDrift({ a: 1 }, { a: 1, b: 2 });
    expect(r.added).toEqual(["b"]);
    expect(r.hasDrift).toBe(true);
  });

  test("detects removed property", () => {
    const r = detectConfigDrift({ a: 1, b: 2 }, { a: 1 });
    expect(r.removed).toEqual(["b"]);
  });

  test("detects changed value", () => {
    const r = detectConfigDrift({ timeout: 5000 }, { timeout: 3000 });
    expect(r.changed).toEqual([{ key: "timeout", from: 5000, to: 3000 }]);
  });

  test("reports multiple differences", () => {
    const r = detectConfigDrift(
      { a: 1, b: 2, c: 3 },
      { a: 9, c: 3, d: 4 }
    );
    expect(r.changed.length).toBe(1);
    expect(r.removed).toEqual(["b"]);
    expect(r.added).toEqual(["d"]);
  });

  test("supports nested objects", () => {
    const r = detectConfigDrift(
      { database: { host: "staging-db", port: 5432 } },
      { database: { host: "production-db", port: 5432 } }
    );
    expect(r.changed).toEqual([
      { key: "database.host", from: "staging-db", to: "production-db" },
    ]);
  });

  test("handles deeply nested differences", () => {
    const r = detectConfigDrift(
      { a: { b: { c: { d: 1 } } } },
      { a: { b: { c: { d: 2 } } } }
    );
    expect(r.changed[0].key).toBe("a.b.c.d");
  });

  test("handles arrays", () => {
    const r = detectConfigDrift({ list: [1, 2, 3] }, { list: [1, 2, 4] });
    expect(r.changed[0].key).toBe("list");
  });

  test("handles empty objects", () => {
    const r = detectConfigDrift({}, {});
    expect(r.hasDrift).toBe(false);
  });

  test("handles null input", () => {
    const r = detectConfigDrift(null, { a: 1 });
    expect(r.hasDrift).toBe(false);
  });

  test("handles undefined input", () => {
    const r = detectConfigDrift(undefined, { a: 1 });
    expect(r.hasDrift).toBe(false);
  });

  test("distinguishes missing vs undefined", () => {
    const r = detectConfigDrift({ a: 1 }, { a: undefined });
    expect(r.changed.length).toBe(1);
    expect(r.changed[0].key).toBe("a");
  });

  test("respects ignored properties", () => {
    const r = detectConfigDrift(
      { a: 1, buildId: "x" },
      { a: 1, buildId: "y" },
      { ignore: ["buildId"] }
    );
    expect(r.hasDrift).toBe(false);
  });

  test("does not mutate inputs", () => {
    const base = { a: 1, nested: { x: 1 } };
    const target = { a: 2, nested: { x: 2 } };
    const baseCopy = JSON.parse(JSON.stringify(base));
    const targetCopy = JSON.parse(JSON.stringify(target));
    detectConfigDrift(base, target);
    expect(base).toEqual(baseCopy);
    expect(target).toEqual(targetCopy);
  });

  test("returns deterministic ordering", () => {
    const r1 = detectConfigDrift({ b: 1, a: 2 }, { b: 2, a: 1 });
    const r2 = detectConfigDrift({ a: 2, b: 1 }, { a: 1, b: 2 });
    expect(r1).toEqual(r2);
  });
});