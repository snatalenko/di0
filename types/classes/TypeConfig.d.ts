namespace DI6 {

	declare class TypeConfig<T> {

		/** Unique type configuration identifier */
		id: Symbol;

		/** List of type aliases */
		aliases: Array<string>;

		/** How to instantiate the type */
		instanceType: "single" | "per-dependency" | "per-container";

		/** Creates an instance of TypeConfig<T> */
		constructor(Type: TClassOrFactory<T>): void;

		/** Type instance factory */
		factory(container: Container): T;

		/**
		 * Instruct to expose object instance on container instance with a given `alias`.
		 * The alias will be used to inject object instance as dependency to other types.
		 */
		as(alias: string): TypeConfig<T>;

		/**
		 * Instruct to create object instances once per containers tree
		 * (current container and derived containers)
		 */
		asSingleInstance(): TypeConfig<T>;

		/** Create instance per each dependency */
		asInstancePerDependency(): TypeConfig<T>;

		/** Create instance per container (default behavior) */
		asInstancePerContainer(): TypeConfig<T>;
	}
}
