import {
	assertAlias,
	assertAliasOrId,
	assertDefined,
	assertFunction,
	assertObject,
	assertString
} from '../../src/assert.ts';

describe('assert', () => {

	describe('assertDefined', () => {

		it('passes for truthy values', () => {
			expect(() => assertDefined('x', 'arg')).not.toThrow();
			expect(() => assertDefined(1, 'arg')).not.toThrow();
			expect(() => assertDefined({}, 'arg')).not.toThrow();
			expect(() => assertDefined(Symbol('x'), 'arg')).not.toThrow();
		});

		it('throws for falsy values', () => {
			for (const value of [undefined, null, '', 0, false])
				expect(() => assertDefined(value, 'arg')).toThrow(new TypeError('arg argument required'));
		});
	});

	describe('assertString', () => {

		it('passes for non-empty strings', () => {
			expect(() => assertString('x', 'arg')).not.toThrow();
		});

		it('throws for missing values', () => {
			expect(() => assertString(undefined, 'arg')).toThrow(new TypeError('arg argument required'));
			expect(() => assertString('', 'arg')).toThrow(new TypeError('arg argument required'));
		});

		it('throws for non-string values', () => {
			for (const value of [1, {}, Symbol('x'), () => { }])
				expect(() => assertString(value, 'arg')).toThrow(new TypeError('arg argument must be a non-empty String'));
		});
	});

	describe('assertAliasOrId', () => {

		it('passes for non-empty strings and symbols', () => {
			expect(() => assertAliasOrId('x', 'arg')).not.toThrow();
			expect(() => assertAliasOrId(Symbol('x'), 'arg')).not.toThrow();
		});

		it('throws for missing values', () => {
			expect(() => assertAliasOrId(undefined, 'arg')).toThrow(new TypeError('arg argument required'));
			expect(() => assertAliasOrId('', 'arg')).toThrow(new TypeError('arg argument required'));
		});

		it('throws for values other than strings and symbols', () => {
			for (const value of [1, {}, () => { }])
				expect(() => assertAliasOrId(value, 'arg')).toThrow(new TypeError('arg argument must be a non-empty String or Symbol'));
		});
	});

	describe('assertFunction', () => {

		it('passes for functions and classes', () => {
			expect(() => assertFunction(() => { }, 'arg')).not.toThrow();
			expect(() => assertFunction(class { }, 'arg')).not.toThrow();
		});

		it('throws for non-function values', () => {
			for (const value of [undefined, null, 'x', 1, {}])
				expect(() => assertFunction(value, 'arg')).toThrow(new TypeError('arg argument must be a Function'));
		});
	});

	describe('assertObject', () => {

		it('passes for objects', () => {
			expect(() => assertObject({}, 'arg')).not.toThrow();
			expect(() => assertObject([], 'arg')).not.toThrow();
		});

		it('throws for non-object values', () => {
			for (const value of [undefined, null, 'x', 1, () => { }])
				expect(() => assertObject(value, 'arg')).toThrow(new TypeError('arg argument must be an Object'));
		});
	});

	describe('assertAlias', () => {

		it('passes for non-empty strings', () => {
			expect(() => assertAlias('x')).not.toThrow();
		});

		it('throws for empty or non-string values', () => {
			for (const value of [undefined, null, '', 1, Symbol('x'), {}])
				expect(() => assertAlias(value)).toThrow(new TypeError('Alias argument must be a non-empty String'));
		});

		it('throws for aliases conflicting with container methods', () => {
			for (const alias of ['get', 'getAll', 'createInstance', 'has'])
				expect(() => assertAlias(alias)).toThrow(new TypeError(`Alias "${alias}" conflicts with container method`));
		});
	});
});
