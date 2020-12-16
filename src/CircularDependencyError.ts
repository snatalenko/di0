/**
 * Circular dependency detected in container aliases
 */
export default class CircularDependencyError extends Error {
	constructor(stack: Readonly<string[]>) {
		super(`Circular dependency detected: ${stack.join('.')}`);
	}
}
