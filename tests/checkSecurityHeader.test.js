const checkSecurityHeaders = require('./checkSecurityHeaders');

describe('checkSecurityHeaders()', () => {
  it('identifies correctly configured headers (All present)', () => {
    const input = {
      "Content-Security-Policy": "default-src 'self'",
      "Strict-Transport-Security": "max-age=31536000",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin",
      "Permissions-Policy": "geolocation=()",
      "X-Frame-Options": "DENY"
    };
    const result = checkSecurityHeaders(input);
    expect(result.score).toBe(100);
    expect(result.present.length).toBe(6);
    expect(result.missing.length).toBe(0);
  });

  it('handles mixed-case header names case-insensitively', () => {
    const input = {
      "cOnTeNt-sEcUrItY-PoLiCy": "default-src 'self'",
      "X-coNTent-TypE-OptionS": "nosniff"
    };
    const result = checkSecurityHeaders(input);
    expect(result.present).toContain("content-security-policy");
    expect(result.present).toContain("x-content-type-options");
    expect(result.score).toBe(33); // 2 out of 6
  });

  it('handles empty, null, or undefined input safely', () => {
    expect(checkSecurityHeaders(null)).toEqual({ score: 0, missing: [], present: [] });
    expect(checkSecurityHeaders(undefined)).toEqual({ score: 0, missing: [], present: [] });
    expect(checkSecurityHeaders("invalid")).toEqual({ score: 0, missing: [], present: [] });
  });

  it('fails headers with invalid values where practical', () => {
    const input = {
      // Invalid because it lacks max-age=
      "Strict-Transport-Security": "includeSubDomains", 
      // Invalid because it is not 'nosniff'
      "X-Content-Type-Options": "invalid-value" 
    };
    const result = checkSecurityHeaders(input);
    expect(result.missing).toContain("strict-transport-security");
    expect(result.missing).toContain("x-content-type-options");
  });

  it('allows configurable recommended header lists', () => {
    const input = { "x-custom-security": "1" };
    const options = { customHeaders: ["X-Custom-Security", "Another-Header"] };
    const result = checkSecurityHeaders(input, options);
    
    expect(result.score).toBe(50);
    expect(result.present).toEqual(["x-custom-security"]);
    expect(result.missing).toEqual(["another-header"]);
  });

  it('does not mutate the original headers object', () => {
    const input = { "X-Frame-Options": "SAMEORIGIN" };
    const inputCopy = { ...input };
    checkSecurityHeaders(input);
    expect(input).toEqual(inputCopy);
  });
});