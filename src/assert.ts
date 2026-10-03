const FORBIDDEN_ALIASES = [
	'get',
	'getAll',
	'createInstance',
	'has'
];

export function assertDefined<T>(value: T, argName: string): asserts value is NonNullable<T> {
	if (!value)
		throw new TypeError(`${argName} argument required`);
}

export function assertString(value: unknown, argName: string): asserts value is string {
	assertDefined(value, argName);
	if (typeof value !== 'string')
		throw new TypeError(`${argName} argument must be a non-empty String`);
}

export function assertAliasOrId(value: unknown, argName: string): asserts value is string | symbol {
	assertDefined(value, argName);
	if (typeof value !== 'string' && typeof value !== 'symbol')
		throw new TypeError(`${argName} argument must be a non-empty String or Symbol`);
}

export function assertFunction(value: unknown, argName: string): asserts value is Function {
	if (typeof value !== 'function')
		throw new TypeError(`${argName} argument must be a Function`);
}

export function assertObject(value: unknown, argName: string): asserts value is object {
	if (typeof value !== 'object' || !value)
		throw new TypeError(`${argName} argument must be an Object`);
}

export function assertAlias(alias: unknown): asserts alias is string {
	if (typeof alias !== 'string' || !alias.length)
		throw new TypeError('Alias argument must be a non-empty String');
	if (FORBIDDEN_ALIASES.includes(alias))
		throw new TypeError(`Alias "${alias}" conflicts with container method`);
}
