namespace DI6 {

	declare class Container {

		constructor(options: { types: Readonly<Array<TypeConfig>>, singletones: TParameterObject, builderFactory: function }): void;

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
