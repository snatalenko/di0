/* eslint-disable no-use-before-define */
'use strict';

const CircularDependencyError = require('./CircularDependencyError');

/** @type {TInstanceType} */
const INSTANCE_SINGLE = 'single';

/** @type {TInstanceType} */
const INSTANCE_PER_DEPENDENCY = 'per-dependency';

/** @type {TInstanceType} */
const INSTANCE_PER_CONTAINER = 'per-container';

/**
 * @param {TClassOrFactory<any>} func
 * @returns {boolean}
 */
function isClass(func) {
	return typeof func === 'function'
		&& Function.prototype.toString.call(func).startsWith('class');
}

/**
 * @param {Container} container
 * @param {TParameterObject} additionalParameters
 * @returns {Container}
 */
function extendContainer(container, additionalParameters) {
	if (!container)
		throw new TypeError('container argument required');
	if (typeof additionalParameters !== 'object' || !additionalParameters)
		throw new TypeError('additionalArguments argument must be an Object');

	const paramDescriptors = Object.getOwnPropertyDescriptors(additionalParameters);
	return Object.create(container, paramDescriptors);
}

/**
 * @template T
 */
class TypeConfig {

	/**
	 * Creates an instance of TypeConfig<T>
	 *
	 * @param {TClassOrFactory<T>} Type
	 */
	constructor(Type) {
		if (typeof Type !== 'function')
			throw new TypeError('Type argument must be a Function');
		if (Type.length > 1)
			throw new TypeError('Type cannot have more than 1 argument');

		/**
		 * Unique type configuration identifier
		 * @type {Symbol}
		 */
		this.id = Symbol(Type.name);

		/**
		 * List of type aliases
		 * @type {string[]}
		 */
		this.aliases = [];

		/**
		 * How to instantiate the type
		 * @type {TInstanceType}
		 */
		this.instanceType = INSTANCE_PER_CONTAINER;

		/**
		 * Type instance factory
		 * @param {Container} container
		 * @returns {T}
		 */
		this.factory = container => container.createInstance(Type);
	}

	/**
	 * Instruct to expose object instance on container instance with a given `alias`.
	 * The alias will be used to inject object instance as dependency to other types.
	 *
	 * @param {string} alias
	 * @returns {TypeConfig<T>}
	 */
	as(alias) {
		if (typeof alias !== 'string' || !alias.length)
			throw new TypeError('Alias argument must be a non-empty String');
		if (this.aliases.includes(alias))
			throw new TypeError(`Alias "${alias}" is already registered for the type`);

		const forbiddenAliases = [
			Container.prototype.get.name,
			Container.prototype.getAll.name,
			Container.prototype.createInstance.name
		];
		if (forbiddenAliases.includes(alias))
			throw new TypeError(`Alias "${alias}" conflicts with container method`);

		this.aliases.push(alias);
		return this;
	}

	/**
	 * Instruct to create object instances once per containers tree
	 * (current container and derived containers)
	 *
	 * @returns {TypeConfig<T>}
	 */
	asSingleInstance() {
		this.instanceType = INSTANCE_SINGLE;
		return this;
	}

	/**
	 * Create instance per each dependency
	 *
	 * @returns {TypeConfig<T>}
	 */
	asInstancePerDependency() {
		this.instanceType = INSTANCE_PER_DEPENDENCY;
		return this;
	}

	/**
	 * Create instance per container (default behavior)
	 *
	 * @returns {TypeConfig<T>}
	 */
	asInstancePerContainer() {
		this.instanceType = INSTANCE_PER_CONTAINER;
		return this;
	}
}

class Container {

	/**
	 * @param {object} options
	 * @param {Readonly<TypeConfig[]>} options.types
	 * @param {TParameterObject} options.singletones
	 * @param {function({ singletones: object }): ContainerBuilder} options.builderFactory
	 */
	constructor({ types, singletones, builderFactory }) {
		this._types = types;
		this._instances = {};
		this._singletones = singletones;
		this._builderFactory = builderFactory;

		/**
		 * Type aliases, stacked on each type instantiation
		 * @type {string[]}
		 */
		this._dependencyStack = [];

		for (const { aliases } of this._types) {
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

		for (const { id, factory } of this._types.filter(t => !t.aliases.length))
			this._instances[id] = factory(this);
	}

	/**
	 * Get instance by alias
	 *
	 * @param {string | Symbol} alias
	 * @returns {object}
	 */
	get(alias) {
		if (!alias)
			throw new TypeError('alias argument required');

		const types = this._types.filter(t => t.id === alias || t.aliases.includes(alias));
		if (!types.length)
			throw new Error(`alias "${alias}" is not registered`);

		const { id, instanceType, factory } = types[types.length - 1];
		if (this._singletones[id])
			return this._singletones[id];

		if (this._instances[id])
			return this._instances[id];

		let instance;
		if (typeof alias === 'string') {
			if (this._dependencyStack.includes(alias))
				throw new CircularDependencyError([...this._dependencyStack, alias]);

			this._dependencyStack.push(alias);
			try {
				instance = factory(this);

				if ('logger' in this && alias !== 'logger')
					this.logger.log('silly', `${this._dependencyStack.join('.')} instance created`);
			}
			finally {
				this._dependencyStack.pop();
			}
		}
		else {
			instance = factory(this);
		}

		if (instanceType === INSTANCE_SINGLE)
			this._singletones[id] = instance;
		else if (instanceType === INSTANCE_PER_CONTAINER)
			this._instances[id] = instance;

		return instance;
	}

	/**
	 * Get all instances by alias
	 *
	 * @param {string} alias
	 * @returns {object[]}
	 */
	getAll(alias) {
		if (!alias)
			throw new TypeError('alias argument required');

		const types = this._types.filter(t => t.aliases.includes(alias));
		if (!types.length)
			throw new Error(`alias "${alias}" is not registered`);

		return types.map(({ id }) => this.get(id));
	}

	/**
	 * Create instance of a given type
	 *
	 * @template T
	 * @param {TClassOrFactory<T>} Type
	 * @param {TParameterObject} [additionalParams]
	 * @returns {T}
	 */
	createInstance(Type, additionalParams) {
		const arg = additionalParams ?
			extendContainer(this, additionalParams) :
			this;

		// @ts-ignore
		return isClass(Type) ? new Type(arg) : Type(arg);
	}

	/**
	 * Create an instance of ContainerBuilder for container extension
	 *
	 * @returns {ContainerBuilder}
	 */
	builder() {
		return this._builderFactory({
			singletones: this._singletones
		});
	}
}

class ContainerBuilder {

	/**
	 * @param {object} [options]
	 * @param {Readonly<TypeConfig[]>} [options.types]
	 * @param {TParameterObject} [options.singletones]
	 */
	constructor({ types = [], singletones = {} } = {}) {
		this._types = [...types];
		this._singletones = singletones;
	}

	/**
	 * Register type or factory
	 *
	 * @template T
	 * @param {TClassOrFactory<T>} Type
	 * @param {string} [alias]
	 * @returns {TypeConfig<T>}
	 */
	register(Type, alias) {
		const t = new TypeConfig(Type);
		if (alias)
			t.as(alias);

		this._types.push(t);
		return t;
	}

	/**
	 * Register instance
	 * (which will be a singleton with an alias)
	 *
	 * @template T
	 * @param {T} instance
	 * @param {string} alias
	 * @returns {TypeConfig<T>}
	 */
	registerInstance(instance, alias) {
		const t = new TypeConfig(() => instance)
			.asSingleInstance()
			.as(alias);

		this._types.push(t);
		return t;
	}

	/**
	 * Create container with the registered types
	 *
	 * @returns {Container}
	 */
	container() {
		const BuilderType = Object.getPrototypeOf(this).constructor;

		return new Container({
			types: Object.freeze([...this._types]),
			singletones: this._singletones,
			builderFactory: ({ singletones }) => new BuilderType({
				types: this._types.filter(t => t.aliases.length),
				singletones
			})
		});
	}
}

module.exports = {
	Container,
	ContainerBuilder
};
