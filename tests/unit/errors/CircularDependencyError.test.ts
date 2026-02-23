import { CircularDependencyError } from '../../../src/errors/index.ts';

describe('CircularDependencyError', () => {

	it('is an instance of Error', () => {
		const err = new CircularDependencyError(['a', 'b']);
		expect(err).toBeInstanceOf(Error);
	});

	it('has name "CircularDependencyError"', () => {
		const err = new CircularDependencyError(['a']);
		expect(err.name).toBe('CircularDependencyError');
	});

	it('formats a string-only stack into the message', () => {
		const err = new CircularDependencyError(['a', 'b', 'c', 'a']);
		expect(err.message).toBe('Circular dependency detected: a.b.c.a');
	});

	it('converts Symbol entries to string in the message', () => {
		const sym = Symbol('myType');
		const err = new CircularDependencyError([sym, 'a', sym]);
		expect(err.message).toBe('Circular dependency detected: Symbol(myType).a.Symbol(myType)');
	});

	it('handles a mixed string and Symbol stack', () => {
		const sym = Symbol('dep');
		const err = new CircularDependencyError(['x', sym, 'y']);
		expect(err.message).toBe('Circular dependency detected: x.Symbol(dep).y');
	});
});
