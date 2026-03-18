/**
 * Circular dependency detected in container aliases
 */
export class CircularDependencyError extends Error {
	constructor(stack: Readonly<(string | Symbol)[]>) {
		super(`Circular dependency detected: ${stack.map(String).join('.')}`);
	}
}

Object.defineProperty(CircularDependencyError.prototype, 'name', {
	value: CircularDependencyError.name,
	writable: true,
	configurable: true
});
