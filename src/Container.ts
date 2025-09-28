import CircularDependencyError from './CircularDependencyError';
import { ContainerBuilder } from './ContainerBuilder';
import { TClassConstructor, TClassOrFactory, TFactory } from './TClassOrFactory';
import { INSTANCE_PER_CONTAINER, INSTANCE_SINGLE } from './TInstanceType';
import { TypeConfig } from './TypeConfig';

type TParameterObject = {
	[key: string]: any
};

function isClass(func: TClassOrFactory<any>): boolean {
	return typeof func === 'function'
		&& Function.prototype.toString.call(func).startsWith('class');
}

function extendContainer(container: Container, additionalParameters: TParameterObject): Container {
	if (!container)
		throw new TypeError('container argument required');
	if (typeof additionalParameters !== 'object' || !additionalParameters)
		throw new TypeError('additionalArguments argument must be an Object');

	const paramDescriptors = Object.getOwnPropertyDescriptors(additionalParameters);
	return Object.create(container, paramDescriptors);
}

export class Container {

	#types: Readonly<TypeConfig<any>[]>;
	#instances: any = {};
	#singletones: any;
	#builderFactory: (options: { singletones: object }) => ContainerBuilder<this>;

	logger?: {
		log: (...args: any) => void
	};

	/** Type aliases, stacked on each type instantiation */
	_dependencyStack: string[] = [];

	constructor({ types, singletones, builderFactory }: {
		types: Readonly<TypeConfig<any>[]>,
		singletones: TParameterObject,
		builderFactory: (options: { singletones: object }) => ContainerBuilder<any>
	}) {
		this.#types = types;
		this.#singletones = singletones;
		this.#builderFactory = builderFactory;

		for (const { aliases } of this.#types) {
			for (const alias of aliases) {
				Object.defineProperty(this, alias, {
					get: () => this.get(alias),
					configurable: true,
					enumerable: true
				});
			}
		}

		// bind container methods to container
		// to allow their usage in dependent constructors and factories
		const methodsToBind = [this.get, this.getAll, this.createInstance];
		for (const method of methodsToBind) {
			Object.defineProperty(this, method.name, {
				value: method.bind(this),
				configurable: true,
				enumerable: false,
				writable: false
			});
		}

		for (const { id, factory } of this.#types.filter(t => !t.aliases.length))
			this.#instances[id] = factory(this);
	}

	/**
	 * Get instance by alias
	 */
	get(alias: string | Symbol): object {
		if (!alias)
			throw new TypeError('alias argument required');

		const types = this.#types.filter(t => t.id === alias || typeof alias === 'string' && t.aliases.includes(alias));
		if (!types.length)
			throw new Error(`alias "${alias}" is not registered`);

		const { id, instanceType, factory } = types[types.length - 1];
		if (this.#singletones[id])
			return this.#singletones[id];

		if (this.#instances[id])
			return this.#instances[id];

		let instance;
		if (typeof alias === 'string') {
			if (this._dependencyStack.includes(alias))
				throw new CircularDependencyError([...this._dependencyStack, alias]);

			this._dependencyStack.push(alias);
			try {
				instance = factory(this);

				if (alias !== 'logger')
					this.logger?.log('silly', `${this._dependencyStack.join('.')} instance created`);
			}
			finally {
				this._dependencyStack.pop();
			}
		}
		else {
			instance = factory(this);
		}

		if (instanceType === INSTANCE_SINGLE)
			this.#singletones[id] = instance;
		else if (instanceType === INSTANCE_PER_CONTAINER)
			this.#instances[id] = instance;

		return instance;
	}

	/**
	 * Get all instances by alias
	 */
	getAll(alias: string): object[] {
		if (!alias)
			throw new TypeError('alias argument required');

		const types = this.#types.filter(t => t.aliases.includes(alias));
		if (!types.length)
			throw new Error(`alias "${alias}" is not registered`);

		return types.map(({ id }) => this.get(id));
	}

	/**
	 * Create instance of a given type
	 */
	createInstance<T>(Type: TClassOrFactory<T>, additionalParams?: TParameterObject): T {
		const arg = additionalParams ?
			extendContainer(this, additionalParams) :
			this;

		if (isClass(Type))
			return new (Type as TClassConstructor<T>)(arg);

		return (Type as TFactory<T>)(arg);
	}

	/**
	 * Create an instance of ContainerBuilder for container extension
	 */
	builder(): ContainerBuilder<this> {
		return this.#builderFactory({
			singletones: this.#singletones
		});
	}
}
