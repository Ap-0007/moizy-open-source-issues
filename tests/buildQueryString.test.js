const assert = require('node:assert/strict');
const { test } = require('node:test');
const buildQueryString = require('../utils/buildQueryString');

const cases = [
  ['basic parameter', { category: 'sports' }, 'category=sports'],
  ['spaces', { search: 'running shoes' }, 'search=running%20shoes'],
  ['special keys and values', { 'a &=': '+&=/?#%' }, 'a%20%26%3D=%2B%26%3D%2F%3F%23%25'],
  ['numbers', { zero: 0, negative: -2, decimal: 1.5 }, 'zero=0&negative=-2&decimal=1.5'],
  ['booleans', { yes: true, no: false }, 'yes=true&no=false'],
  ['undefined', { skip: undefined, page: 2 }, 'page=2'],
  ['null', { skip: null, page: 2 }, 'page=2'],
  ['empty object', {}, ''],
  ['all omitted', { a: null, b: undefined, c: [] }, ''],
  ['empty strings and keys', { search: '', '': 'value' }, 'search=&=value'],
  ['arrays', { tags: ['javascript', 'node', 'api'] }, 'tags=javascript&tags=node&tags=api'],
  ['mixed array', { items: [0, false, '', null, undefined, 'a b', 'a b'] }, 'items=0&items=false&items=&items=a%20b&items=a%20b'],
  ['sparse array', { items: [, 'api'] }, 'items=api'],
  ['Unicode', { '你好': 'café 🌍' }, '%E4%BD%A0%E5%A5%BD=caf%C3%A9%20%F0%9F%8C%8D'],
  ['multiple parameters', { search: 'running shoes', page: 2, category: 'sports', featured: true }, 'search=running%20shoes&page=2&category=sports&featured=true'],
  ['encoded-looking text', { search: 'running%20shoes' }, 'search=running%2520shoes'],
  ['integer key order', { z: 1, 2: 'two', 1: 'one', a: 2 }, '1=one&2=two&z=1&a=2']
];

for (const [name, input, expected] of cases) {
  test(name, () => {
    assert.equal(buildQueryString(input), expected);
  });
}

test('does not mutate frozen input or arrays', () => {
  const input = Object.freeze({ tags: Object.freeze(['node', null, 'api']), page: 2 });
  assert.equal(buildQueryString(input), 'tags=node&tags=api&page=2');
  assert.deepEqual(input, { tags: ['node', null, 'api'], page: 2 });
});

test('supports null prototypes and ignores non-enumerable and symbol keys', () => {
  const input = Object.assign(Object.create(null), { page: 2 });
  Object.defineProperty(input, 'hidden', { value: 'secret' });
  input[Symbol('ignored')] = 'value';
  assert.equal(buildQueryString(input), 'page=2');
});

test('rejects non-plain input', () => {
  for (const input of [undefined, null, [], 'text', 2, true, new Date(), Object.create({ inherited: 1 })]) {
    assert.throws(() => buildQueryString(input), TypeError);
  }
});

test('rejects unsupported values, including array items', () => {
  for (const value of [{}, [[]], Symbol('value'), 1n, () => {}, NaN, Infinity, -Infinity]) {
    assert.throws(() => buildQueryString({ value }), TypeError);
    assert.throws(() => buildQueryString({ value: [value] }), TypeError);
  }
});

test('retains encodeURIComponent behavior for malformed Unicode', () => {
  assert.throws(() => buildQueryString({ value: '\uD800' }), URIError);
  assert.throws(() => buildQueryString({ '\uD800': 'value' }), URIError);
});