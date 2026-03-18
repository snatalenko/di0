const FORBIDDEN_ALIASES = [
	'get',
	'getAll',
	'createInstance',
	'has'
];

export function validateAlias(alias: unknown): asserts alias is string {
	if (typeof alias !== 'string' || !alias.length)
		throw new TypeError('Alias argument must be a non-empty String');
	if (FORBIDDEN_ALIASES.includes(alias))
		throw new TypeError(`Alias "${alias}" conflicts with container method`);
}
