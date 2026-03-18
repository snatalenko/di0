/**
 * Error thrown when multiple types match a resolver alias
 */
export class AmbiguousResolverError extends Error {
	constructor(alias: string, classNames: string[]) {
		const namesStr = classNames.length ? ` (${classNames.join(', ')})` : '';
		super(`Multiple types matched resolver for alias "${alias}"${namesStr}: use .as() to disambiguate`);
	}
}

Object.defineProperty(AmbiguousResolverError.prototype, 'name', {
	value: AmbiguousResolverError.name,
	writable: true,
	configurable: true
});
