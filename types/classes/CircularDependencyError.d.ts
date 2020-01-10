namespace DI6 {

	declare class CircularDependencyError extends Error {

		constructor(stack: Readonly<Array<string>>): void;
	}
}
