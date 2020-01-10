'use strict';

/**
 * Circular dependency detected in container aliases
 *
 * @extends {Error}
 */
class CircularDependencyError extends Error {
	/**
	 * @param {Readonly<string[]>} stack
	 */
	constructor(stack) {
		super(`Circular dependency detected: ${stack.join('.')}`);
	}
}

module.exports = CircularDependencyError;
