const sanitizeFileName = require('../utils/sanitizeFileName');

describe('sanitizeFileName utility', () => {
  test('handles standard filenames', () => {
    expect(sanitizeFileName('report.pdf')).toBe('report.pdf');
  });

  test('normalizes leading/trailing whitespace and spaces between words', () => {
    expect(sanitizeFileName('  My Project (Final)!!.pdf ')).toBe('my-project-final.pdf');
  });

  test('normalizes special characters and symbols', () => {
    expect(sanitizeFileName('Product Image #01 (Final).PNG')).toBe('product-image-01-final.png');
  });

  test('replaces path separators / and \\ to prevent directory traversal', () => {
    expect(sanitizeFileName('../../etc/passwd.txt')).toBe('etc-passwd.txt');
    expect(sanitizeFileName('C:\\Windows\\system32\\calc.exe')).toBe('c-windows-system32-calc.exe');
  });

  test('normalizes multiple consecutive separators and dots', () => {
    expect(sanitizeFileName('my---file...name.pdf')).toBe('my-file.name.pdf');
  });

  test('handles Unicode accents and characters safely', () => {
    expect(sanitizeFileName('résumé_détaillé 2026.docx')).toBe('resume_detaille-2026.docx');
  });

  test('preserves hidden files', () => {
    expect(sanitizeFileName('.gitignore')).toBe('.gitignore');
    expect(sanitizeFileName('.env.local')).toBe('.env.local');
  });

  test('handles filenames without extensions', () => {
    expect(sanitizeFileName('README')).toBe('readme');
  });

  test('handles empty or non-string inputs safely', () => {
    expect(sanitizeFileName('')).toBe('unnamed-file');
    expect(sanitizeFileName('   ')).toBe('unnamed-file');
    expect(sanitizeFileName(null)).toBe('unnamed-file');
    expect(sanitizeFileName(undefined)).toBe('unnamed-file');
  });

  test('enforces custom maximum length', () => {
    const longName = 'a'.repeat(300) + '.txt';
    const sanitized = sanitizeFileName(longName, { maxLength: 20 });
    expect(sanitized.length).toBeLessThanOrEqual(20);
    expect(sanitized.endsWith('.txt')).toBe(true);
  });

  test('supports custom replacement character', () => {
    expect(sanitizeFileName('hello world image.png', { replacement: '_' })).toBe('hello_world_image.png');
  });

  test('does not mutate original input string', () => {
    const input = ' Test File #1.PDF ';
    const copy = input;
    sanitizeFileName(input);
    expect(input).toBe(copy);
  });
});
