const { checkHtmlAccessibility } = require("../utils/checkHtmlAccessibility");

describe("checkHtmlAccessibility", () => {
  test("returns valid for empty HTML", () => {
    const result = checkHtmlAccessibility("");
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test("returns valid for null input", () => {
    const result = checkHtmlAccessibility(null);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test("returns valid for accessible image", () => {
    const result = checkHtmlAccessibility('<img src="a.png" alt="A cat">');
    expect(result.valid).toBe(true);
  });

  test("flags image missing alt", () => {
    const result = checkHtmlAccessibility('<img src="a.png">');
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe("image-alt");
  });

  test("allows decorative images", () => {
    const result = checkHtmlAccessibility('<img src="a.png" alt="" role="presentation">');
    expect(result.valid).toBe(true);
  });

  test("flags unlabeled input", () => {
    const result = checkHtmlAccessibility('<input type="text" id="name">');
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe("form-label");
  });

  test("allows labelled input via for/id", () => {
    const html = '<label for="name">Name</label><input type="text" id="name">';
    const result = checkHtmlAccessibility(html);
    expect(result.valid).toBe(true);
  });

  test("allows input with aria-label", () => {
    const result = checkHtmlAccessibility('<input type="text" aria-label="Name">');
    expect(result.valid).toBe(true);
  });

  test("flags button with no text", () => {
    const result = checkHtmlAccessibility("<button></button>");
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe("button-name");
  });

  test("allows button with text", () => {
    const result = checkHtmlAccessibility("<button>Submit</button>");
    expect(result.valid).toBe(true);
  });

  test("flags empty link", () => {
    const result = checkHtmlAccessibility('<a href="/x"></a>');
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe("link-name");
  });

  test("allows link with text", () => {
    const result = checkHtmlAccessibility('<a href="/x">Home</a>');
    expect(result.valid).toBe(true);
  });

  test("flags missing lang on html", () => {
    const result = checkHtmlAccessibility("<html><body></body></html>");
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe("html-lang");
  });

  test("allows html with lang", () => {
    const result = checkHtmlAccessibility('<html lang="en"><body></body></html>');
    expect(result.valid).toBe(true);
  });

  test("flags skipped heading level", () => {
    const result = checkHtmlAccessibility("<h1>Title</h1><h3>Section</h3>");
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe("heading-order");
  });

  test("allows correct heading hierarchy", () => {
    const result = checkHtmlAccessibility("<h1>Title</h1><h2>Section</h2>");
    expect(result.valid).toBe(true);
  });

  test("reports multiple violations", () => {
    const html = '<html><body><img src="a.png"><a href="/x"></a></body></html>';
    const result = checkHtmlAccessibility(html);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });

  test("respects disabled rules", () => {
    const result = checkHtmlAccessibility('<img src="a.png">', {
      rules: { "image-alt": false },
    });
    expect(result.valid).toBe(true);
  });

  test("handles malformed HTML without throwing", () => {
    expect(() => checkHtmlAccessibility("<img src='a.png'")).not.toThrow();
  });

  test("does not modify the original HTML", () => {
    const html = '<img src="a.png">';
    checkHtmlAccessibility(html);
    expect(html).toBe('<img src="a.png">');
  });

  test("handles multiple independent documents", () => {
    const r1 = checkHtmlAccessibility("<html><body></body></html>");
    const r2 = checkHtmlAccessibility('<html lang="en"><body></body></html>');
    expect(r1.valid).toBe(false);
    expect(r2.valid).toBe(true);
  });
});