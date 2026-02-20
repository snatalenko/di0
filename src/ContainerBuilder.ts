import { Container } from "./Container";
import { TClassConstructor, TClassOrFactory, TFactory } from "./TClassOrFactory";
import { TypeConfig } from "./TypeConfig";

type TParameterObject = {
	[key: string]: any
};

export class ContainerBuilder<TContainerInterface = any> {

	#types: TypeConfig<any, TContainerInterface>[];
	#singletons: {};

	constructor({ types = [], singletons = {} }: {
		types?: Readonly<TypeConfig<any>[]>,
		singletons?: TParameterObject
	} = {}) {
		this.#types = [...types];
		this.#singletons = singletons;
	}

	/** Register an initializer to be executed automatically when the container is created */
	register<T>(initializer: TFactory<T, TContainerInterface>):
		TypeConfig<T, TContainerInterface>;

	/** Register a factory and expose the produced value on the container under `alias` */
	register<T>(factory: TFactory<T, TContainerInterface>, alias: keyof TContainerInterface):
		TypeConfig<T, TContainerInterface>;

	/** Register an initializer to be executed automatically when the container is created */
	register<T>(Type: TClassConstructor<T>):
		TypeConfig<T, TContainerInterface>;

	/** Register a class constructor and expose its instance on the container under the given `alias` */
	register<T>(Type: TClassConstructor<T>, alias: keyof TContainerInterface):
		TypeConfig<T, TContainerInterface>;

	register<T>(Type: TClassOrFactory<T, TContainerInterface>, alias?: keyof TContainerInterface): TypeConfig<T, TContainerInterface> {
		const t = new TypeConfig<T, TContainerInterface>(Type);
		if (alias)
			t.as(alias);

		this.#types.push(t);
		return t;
	}

	/**
	 * Register instance
	 * (which will be a singleton with an alias)
	 */
	registerInstance<T>(instance: T, alias: keyof TContainerInterface): TypeConfig<T, TContainerInterface> {
		const t = new TypeConfig<T, TContainerInterface>(() => instance)
			.asSingleInstance()
			.as(alias);

		this.#types.push(t);
		return t;
	}

	/**
	 * Create container with the registered types
	 */
	container(): TContainerInterface {
		const BuilderType = Object.getPrototypeOf(this).constructor;

		return new Container({
			types: Object.freeze([...this.#types]),
			singletons: this.#singletons,
			builderFactory: ({ singletons }) => new BuilderType({
				types: this.#types.filter(t => t.aliases.length),
				singletons
			})
		}) as TContainerInterface;
	}
}
