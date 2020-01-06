namespace DI6 {

	declare class ContainerBuilder {

		constructor(options?: { types?: Array<TypeConfig>, singletones?: TParameterObject }): void;

		/** Register type or factory */
		register(Type: TClassOrFactory<T>, alias?: string): TypeConfig<T>;

		/**
		 * Register instance
		 * (which will be a singleton with an alias)
		 */
		registerInstance(instance: T, alias: string): TypeConfig<T>;

		/** Create container with the registered types */
		container(): Container;
	}
}
