import { AmbiguousResolverError } from '../../../src/errors/index.ts';

describe('AmbiguousResolverError', () => {

	it('is an instance of Error', () => {
		const err = new AmbiguousResolverError('engine', []);
		expect(err).toBeInstanceOf(Error);
	});

	it('has name "AmbiguousResolverError"', () => {
		const err = new AmbiguousResolverError('engine', []);
		expect(err.name).toBe('AmbiguousResolverError');
	});

	it('includes class names in the message when provided', () => {
		const err = new AmbiguousResolverError('engine', ['DieselEngine', 'ElectricEngine']);
		expect(err.message).toBe(
			'Multiple types matched resolver for alias "engine" (DieselEngine, ElectricEngine): use .as() to disambiguate'
		);
	});

	it('omits the class name list when none are provided', () => {
		const err = new AmbiguousResolverError('engine', []);
		expect(err.message).toBe(
			'Multiple types matched resolver for alias "engine": use .as() to disambiguate'
		);
	});
});
