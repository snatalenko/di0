import { Container } from "./Container";
import { TClassOrFactory } from "./TClassOrFactory";
import { TypeConfig } from "./TypeConfig";

type TParameterObject = {
	[key: string]: any
};

export class ContainerBuilder {

	#types: TypeConfig<any>[];
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
	register<T>(Type: TClassOrFactory<T>, alias?: string): TypeConfig<T> {
		const t = new TypeConfig<T>(Type);
		if (alias)
			t.as(alias);

		this.#types.push(t);
		return t;
	}

	/**
	 * Register instance
	 * (which will be a singleton with an alias)
	 */
	registerInstance<T>(instance: T, alias: string): TypeConfig<T> {
		const t = new TypeConfig<T>(() => instance)
			.asSingleInstance()
			.as(alias);

		this.#types.push(t);
		return t;
	}

	/**
	 * Create container with the registered types
	 */
	container(): Container {
		const BuilderType = Object.getPrototypeOf(this).constructor;

		return new Container({
			types: Object.freeze([...this.#types]),
			singletones: this.#singletones,
			builderFactory: ({ singletones }) => new BuilderType({
				types: this.#types.filter(t => t.aliases.length),
				singletones
			})
		});
	}
}
