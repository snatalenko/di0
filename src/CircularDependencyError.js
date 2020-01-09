'use strict';

/**
 * Circular dependency detected in container aliases
 *
 * @extends {Error}
 */
class CircularDependencyError extends Error {
	constructor(stack) {
		super(`Circular dependency detected: ${stack.filter(s => typeof s === 'string').join(' --> ')}`);
	}
}

module.exports = CircularDependencyError;
