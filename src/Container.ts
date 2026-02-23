import { CircularDependencyError, AmbiguousResolverError } from './errors/index.ts';
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
	readonly #builderFactory: (options: { singletons: object }) => ContainerBuilder<this>;

	logger?: {
		log: (...args: any) => void
	};

	/** Tracks what is currently being resolved — string aliases and symbol type IDs */
	protected readonly _dependencyStack: Set<string | Symbol> = new Set();

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

		for (const [alias] of this.#resolvers) {
			Object.defineProperty(this, alias, {
				get: () => this.get(alias),
				configurable: true,
				enumerable: true
			});
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
		for (const { id, type: Type, instanceType } of this.#types.filter(t => !t.aliases.length)) {
			if (id in this.#instances || id in this.#singletons)
				continue;

			const instance = this.#instantiate(id, Type);

			if (instanceType === INSTANCE_SINGLE)
				this.#singletons[id] = instance;
			else
				this.#instances[id] = instance;
		}
	}

	#instantiate<T>(key: string | Symbol, Type: ClassOrFactory<T, any>): T {
		if (this._dependencyStack.has(key))
			throw new CircularDependencyError([...this._dependencyStack, key]);

		this._dependencyStack.add(key);
		try {
			const instance = this.createInstance(Type);

			if (!this._dependencyStack.has('logger'))
				this.logger?.log('silly', `${[...this._dependencyStack].map(String).join('.')} instance created`);

			return instance;
		}
		finally {
			this._dependencyStack.delete(key);
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

		const { id, instanceType, type: Type } = types[types.length - 1];

		if (id in this.#singletons)
			return this.#singletons[id];

		if (id in this.#instances)
			return this.#instances[id];

		const instance = this.#instantiate(alias, Type);

		if (instanceType === INSTANCE_SINGLE)
			this.#singletons[id] = instance;
		else if (instanceType === INSTANCE_PER_CONTAINER)
			this.#instances[id] = instance;

		return instance;
	}

	/** Scan already-created instances for predicate matches */
	* #findInstancesByPredicate(pred: (instance: any) => boolean): IterableIterator<any> {
		for (const { id, aliases } of this.#types) {
			if (aliases.length)
				continue; // unaliased types only

			if (id in this.#instances && pred(this.#instances[id]))
				yield this.#instances[id];

			if (id in this.#singletons && pred(this.#singletons[id]))
				yield this.#singletons[id];
		}
	}

	/**
	 * Scan uninstantiated class-type registrations via prototype matching.
	 * Only runs when #resolveByInstances found nothing.
	 */
	* #findPrototypesByPredicate(pred: (instance: any) => boolean): IterableIterator<any> {
		for (const { id, type: Type, aliases } of this.#types) {
			if (aliases.length)
				continue; // unaliased types only
			if (this._dependencyStack.has(id))
				continue; // skip types currently being constructed
			if (id in this.#instances || id in this.#singletons)
				continue; // already instantiated — handled by #resolveByInstances
			if (!isClass(Type))
				continue; // factory functions have no meaningful prototype

			if (pred(Object.create(Type.prototype)))
				yield this.get(id);
		}
	}

	/**
	 * Resolve a value via registered predicate.
	 * First checks already-created instances; falls back to prototype scanning.
	 */
	#resolveByPredicate(alias: string, pred: (instance: any) => boolean): object {
		const matches = [];

		for (const m of this.#findInstancesByPredicate(pred))
			matches.push(m);

		if (!matches.length) {
			for (const m of this.#findPrototypesByPredicate(pred))
				matches.push(m);
		}

		if (matches.length > 1) {
			const names = matches.map(m => m?.constructor?.name).filter(n => !!n);
			throw new AmbiguousResolverError(alias, names);
		}

		return matches[0];
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
