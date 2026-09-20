/**
 * Analyzes HTTP response headers and reports which recommended security headers are present or missing.
 * 
 * @param {Object} headers 
 * @param {Object} [options] 
 * @param {string[]} [options.customHeaders] 
 * @returns {{score: number, missing: string[], present: string[]}} 
 */
function checkSecurityHeaders(headers, options = {}) {
  const result = { score: 0, missing: [], present: [] };

  if (!headers || typeof headers !== 'object' || Array.isArray(headers)) {
    return result;
  }

 
  const defaultHeaders = [
    "content-security-policy",
    "strict-transport-security",
    "x-content-type-options",
    "referrer-policy",
    "permissions-policy",
    "x-frame-options"
  ];

  const targetHeaders = options.customHeaders 
    ? options.customHeaders.map(h => h.toLowerCase()) 
    : defaultHeaders;


  const normalizedHeaders = Object.keys(headers).reduce((acc, key) => {
    acc[key.toLowerCase()] = headers[key];
    return acc;
  }, {});


  const validators = {
    'x-content-type-options': (val) => val.toLowerCase() === 'nosniff',
    'strict-transport-security': (val) => val.toLowerCase().includes('max-age=')
  };

  targetHeaders.forEach(header => {
    const value = normalizedHeaders[header];
    
    let isValid = typeof value === 'string' && value.trim() !== '';

   
    if (isValid && validators[header]) {
      isValid = validators[header](value);
    }

    if (isValid) {
      result.present.push(header);
    } else {
      result.missing.push(header);
    }
  });

  
  if (targetHeaders.length > 0) {
    result.score = Math.round((result.present.length / targetHeaders.length) * 100);
  } else {
    result.score = 100; 
  }

  return result;
}

module.exports = checkSecurityHeaders; 