import { Container } from "./Container.ts";
import type { ClassConstructor, ClassOrFactory, Factory } from "./ClassOrFactory.ts";
import { TypeConfig } from "./TypeConfig.ts";
import { validateAlias } from "./validateAlias.ts";

type TParameterObject = {
	[key: string]: any
};

type TResolvers = Map<string, (instance: any) => boolean>;

export class ContainerBuilder<TContainerInterface = any> {

	#types: TypeConfig<any, TContainerInterface>[];
	#singletons: {};
	#resolvers: TResolvers;

	constructor({ types = [], singletons = {}, resolvers = new Map() }: {
		types?: Readonly<TypeConfig<any>[]>,
		singletons?: TParameterObject,
		resolvers?: TResolvers
	} = {}) {
		this.#types = [...types];
		this.#singletons = singletons;
		this.#resolvers = new Map(resolvers);
	}

	/** Register an initializer to be executed automatically when the container is created */
	register<T>(initializer: Factory<T, TContainerInterface>):
		TypeConfig<T, TContainerInterface>;

	/** Register a factory and expose the produced value on the container under `alias` */
	register<T>(factory: Factory<T, TContainerInterface>, alias: keyof TContainerInterface):
		TypeConfig<T, TContainerInterface>;

	/** Register an initializer to be executed automatically when the container is created */
	register<T>(Type: ClassConstructor<T>):
		TypeConfig<T, TContainerInterface>;

	/** Register a class constructor and expose its instance on the container under the given `alias` */
	register<T>(Type: ClassConstructor<T>, alias: keyof TContainerInterface):
		TypeConfig<T, TContainerInterface>;

	register<T>(Type: ClassOrFactory<T, TContainerInterface>, alias?: keyof TContainerInterface): TypeConfig<T, TContainerInterface> {
		const t = new TypeConfig<T, TContainerInterface>(Type);
		if (alias)
			t.as(alias);

		this.#types.push(t);
		return t;
	}

	/** Register instance as a singleton, optionally exposed under `alias` */
	registerInstance<T>(instance: T, alias?: keyof TContainerInterface): TypeConfig<T, TContainerInterface> {
		const t = new TypeConfig<T, TContainerInterface>(() => instance)
			.asSingleInstance();

		if (alias)
			t.as(alias);

		this.#types.push(t);
		return t;
	}

	/**
	 * Register a resolver predicate that automatically wires an unaliased type to the given alias.
	 * The predicate receives an instance and must return true for the type to be exposed under `alias`.
	 * Exactly one unaliased type must match — zero or multiple matches throw at access time.
	 */
	addResolver(pred: (instance: any) => boolean, alias: keyof TContainerInterface): this {
		validateAlias(alias);
		this.#resolvers.set(alias as string, pred);
		return this;
	}

	/**
	 * Create container with the registered types
	 */
	container(): TContainerInterface {
		const BuilderType = Object.getPrototypeOf(this).constructor;

		return new Container({
			types: Object.freeze([...this.#types]),
			singletons: this.#singletons,
			resolvers: this.#resolvers,
			builderFactory: ({ singletons }) => new BuilderType({
				types: this.#resolvers.size
					? this.#types
					: this.#types.filter(t => t.aliases.length),
				singletons,
				resolvers: this.#resolvers
			})
		}) as TContainerInterface;
	}
}
