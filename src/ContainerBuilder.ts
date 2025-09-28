import { Container } from "./Container";
import { TClassOrFactory } from "./TClassOrFactory";
import { TypeConfig } from "./TypeConfig";

type TParameterObject = {
	[key: string]: any
};

export class ContainerBuilder<TContainerInterface extends Container = any> {

	#types: TypeConfig<any, TContainerInterface>[];
	#singletones: {};

	constructor({ types = [], singletones = {} }: {
		types?: Readonly<TypeConfig<any>[]>,
		singletones?: TParameterObject
	} = {}) {
		this.#types = [...types];
		this.#singletones = singletones;
	}

	/**
	 * Register type or factory
	 */
	register<T>(Type: TClassOrFactory<T>, alias?: keyof TContainerInterface): TypeConfig<T, TContainerInterface> {
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
			singletones: this.#singletones,
			builderFactory: ({ singletones }) => new BuilderType({
				types: this.#types.filter(t => t.aliases.length),
				singletones
			})
		}) as TContainerInterface;
	}
}
