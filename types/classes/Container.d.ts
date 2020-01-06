namespace DI6 {

	declare class Container {

		constructor(options?: { types?: Array<TypeConfig>, singletones?: TParameterObject }): void;

		/** Get instance by alias */
		get(alias: string | Symbol): object;

		/** Get all instances by alias */
		getAll(alias: string): Array<object>;

		/** Create instance of a given type */
		createInstance<T>(Type: TClassOrFactory<T>, additionalParams?: TParameterObject): T;

		/** Create an instance of ContainerBuilder for container extension */
		builder(): ContainerBuilder;
	}
}
