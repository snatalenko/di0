import CircularDependencyError from './CircularDependencyError.ts';
import { ContainerBuilder } from './ContainerBuilder.ts';
import type { ClassConstructor, ClassOrFactory, Factory } from './ClassOrFactory.ts';
import { INSTANCE_PER_CONTAINER, INSTANCE_SINGLE } from './LifetimeMode.ts';
import { TypeConfig } from './TypeConfig.ts';

type ParameterObject = {
	[key: string]: any
};

type Resolvers = Map<string, (instance: any) => boolean>;

function isClass<T, C>(func: ClassOrFactory<T, C>):
	func is ClassConstructor<T> {
	return typeof func === 'function'
		&& Function.prototype.toString.call(func).startsWith('class');
}

function extendContainer<T>(container: T, additionalParameters: ParameterObject): T {
	if (!container)
		throw new TypeError('container argument required');
	if (typeof additionalParameters !== 'object' || !additionalParameters)
		throw new TypeError('additionalArguments argument must be an Object');

	const paramDescriptors = Object.getOwnPropertyDescriptors(additionalParameters);
	return Object.create(container, paramDescriptors);
}

export class Container {

	readonly #types: Readonly<TypeConfig<any>[]>;
	readonly #instances: any = {};
	readonly #singletons: any;
	readonly #resolvers: Resolvers;
	readonly #inProgress: Set<symbol> = new Set();
	readonly #builderFactory: (options: { singletons: object }) => ContainerBuilder<this>;

	logger?: {
		log: (...args: any) => void
	};

	/** Type aliases, stacked on each type instantiation */
	_dependencyStack: string[] = [];

	constructor({ types, singletons, resolvers = new Map(), builderFactory }: {
		types: Readonly<TypeConfig<any>[]>,
		singletons: ParameterObject,
		resolvers?: Resolvers,
		builderFactory: (options: { singletons: object }) => ContainerBuilder<any>
	}) {
		this.#types = types;
		this.#singletons = singletons;
		this.#resolvers = resolvers;
		this.#builderFactory = builderFactory;

		const singleAliases = new Set<string>();
		const collectionAliases = new Set<string>();
		for (const { aliases, collectionAliases: ca } of this.#types) {
			for (const alias of aliases) {
				if (ca.has(alias))
					collectionAliases.add(alias);
				else
					singleAliases.add(alias);
			}
		}
		for (const alias of collectionAliases) {
			if (singleAliases.has(alias))
				throw new TypeError(`Alias "${alias}" is registered with both .as() and .asOneOf() — use one or the other`);
		}

		for (const { aliases } of this.#types) {
			for (const alias of aliases) {
				Object.defineProperty(this, alias, {
					get: collectionAliases.has(alias)
						? () => this.getAll(alias)
						: () => this.get(alias),
					configurable: true,
					enumerable: true
				});
			}
		}

		// Resolver alias getters — only for aliases not already covered by an explicit registration.
		// If an explicit alias exists, get() finds it first; the resolver is not consulted.
		for (const [alias] of this.#resolvers) {
			if (singleAliases.has(alias) || collectionAliases.has(alias))
				continue;

			Object.defineProperty(this, alias, {
				get: () => this.get(alias),
				configurable: true,
				enumerable: true
			});
		}

		// bind container methods to container
		// to allow their usage in dependent constructors and factories
		const methodsToBind = [this.get, this.getAll, this.createInstance, this.has];
		for (const method of methodsToBind) {
			Object.defineProperty(this, method.name, {
				value: method.bind(this),
				configurable: true,
				enumerable: false,
				writable: false
			});
		}

		// Eagerly instantiate unaliased types (initializers).
		// #inProgress tracks types mid-instantiation so resolver scans skip them,
		// and the skip-if-already-set guard prevents double-instantiation when a
		// resolver triggered lazy instantiation first.
		for (const type of this.#types.filter(t => !t.aliases.length)) {
			const { id, factory, instanceType } = type;
			if (Object.prototype.hasOwnProperty.call(this.#instances, id))
				continue;
			if (Object.prototype.hasOwnProperty.call(this.#singletons, id))
				continue;

			const instance = this.#runFactory(id, factory);

			if (instanceType === INSTANCE_SINGLE)
				this.#singletons[id] = instance;
			else
				this.#instances[id] = instance;
		}
	}

	/** Invoke a factory while marking its type as in-progress, so resolver scans can skip it */
	#runFactory<T>(id: symbol, factory: (c: this) => T): T {
		this.#inProgress.add(id);
		try {
			return factory(this);
		}
		finally {
			this.#inProgress.delete(id);
		}
	}

	/**
	 * Get instance by alias
	 */
	get(alias: string | Symbol): object {
		if (!alias)
			throw new TypeError('alias argument required');

		const types = this.#types.filter(t => t.id === alias || typeof alias === 'string' && t.aliases.includes(alias));
		if (!types.length) {
			if (typeof alias === 'string') {
				const pred = this.#resolvers.get(alias);
				if (pred)
					return this.#resolveByPredicate(alias, pred);
			}
			throw new Error(`alias "${alias}" is not registered`);
		}

		const { id, instanceType, factory } = types[types.length - 1];
		if (Object.prototype.hasOwnProperty.call(this.#singletons, id))
			return this.#singletons[id];

		if (Object.prototype.hasOwnProperty.call(this.#instances, id))
			return this.#instances[id];

		let instance;
		if (typeof alias === 'string') {
			if (this._dependencyStack.includes(alias))
				throw new CircularDependencyError([...this._dependencyStack, alias]);

			this._dependencyStack.push(alias);
			try {
				instance = this.#runFactory(id, factory);

				if (alias !== 'logger')
					this.logger?.log('silly', `${this._dependencyStack.join('.')} instance created`);
			}
			finally {
				this._dependencyStack.pop();
			}
		}
		else {
			instance = this.#runFactory(id, factory);
		}

		if (instanceType === INSTANCE_SINGLE)
			this.#singletons[id] = instance;
		else if (instanceType === INSTANCE_PER_CONTAINER)
			this.#instances[id] = instance;

		return instance;
	}

	/**
	 * Resolve a value by scanning all unaliased types with the given predicate.
	 * Called by get() when no explicit registration is found for the alias.
	 * Throws if more than one type matches.
	 */
	#resolveByPredicate(alias: string, pred: (instance: any) => boolean): object {
		if (this._dependencyStack.includes(alias))
			throw new CircularDependencyError([...this._dependencyStack, alias]);

		this._dependencyStack.push(alias);
		try {
			const matches: any[] = [];
			for (const { id, aliases: typeAliases } of this.#types) {
				if (typeAliases.length)
					continue; // unaliased types only
				if (this.#inProgress.has(id))
					continue; // skip types currently being instantiated

				const inst = this.get(id);
				if (pred(inst))
					matches.push(inst);
			}

			if (matches.length > 1)
				throw new TypeError(`Multiple types matched resolver for alias "${alias}": use .as() to disambiguate`);

			return matches[0];
		}
		finally {
			this._dependencyStack.pop();
		}
	}

	/**
	 * Check whether the container can provide a value for the given alias.
	 *
	 * @returns
	 *   - `true` — explicitly registered via `.as()` / `.asOneOf()`, or a resolver has already matched a cached instance
	 *   - `false` — no registration and no resolver covers the alias
	 *   - `undefined` — a resolver is registered but no cached instance matches yet (outcome uncertain without instantiation)
	 */
	has(alias: string | Symbol): boolean | undefined {
		if (!alias)
			throw new TypeError('alias argument required');

		if (this.#types.some(t => t.id === alias || typeof alias === 'string' && t.aliases.includes(alias)))
			return true;

		if (typeof alias === 'string') {
			const pred = this.#resolvers.get(alias);
			if (pred) {
				const alreadyResolved = this.#types.some(({ id, aliases: typeAliases }) => {
					if (typeAliases.length)
						return false;

					const inst = this.#instances[id] ?? this.#singletons[id];
					return inst !== undefined && pred(inst);
				});

				return alreadyResolved || undefined;
			}
		}

		return false;
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

	createInstance<TClass extends new (...args: any) => any>(
		Type: TClass,
		additionalParams?: Partial<ConstructorParameters<TClass>[0]>
	): InstanceType<TClass>;
	createInstance<T>(factory: Factory<T, this>, additionalParams?: ParameterObject): T;
	createInstance<T>(Type: ClassOrFactory<T, this>, additionalParams?: ParameterObject): T;

	/**
	 * Create instance of a given type
	 */
	createInstance<T>(Type: ClassOrFactory<T, this>, additionalParams?: ParameterObject): T {
		const arg = additionalParams ?
			extendContainer(this, additionalParams) :
			this;

		if (isClass(Type))
			return new Type(arg);

		return Type(arg);
	}

	/**
	 * Create an instance of ContainerBuilder for container extension
	 */
	builder(): ContainerBuilder<this> {
		return this.#builderFactory({
			singletons: this.#singletons
		});
	}
}
