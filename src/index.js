'use strict';

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
		 * @type {"single" | "per-dependency" | "per-container"}
		 */
		this.instanceType = 'per-container';

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
		this.instanceType = 'single';
		return this;
	}

	/**
	 * Create instance per each dependency
	 *
	 * @returns {TypeConfig<T>}
	 */
	asInstancePerDependency() {
		this.instanceType = 'per-dependency';
		return this;
	}

	/**
	 * Create instance per container (default behavior)
	 *
	 * @returns {TypeConfig<T>}
	 */
	asInstancePerContainer() {
		this.instanceType = 'per-container';
		return this;
	}
}

class Container {

	/**
	 * @param {object} [options]
	 * @param {TypeConfig[]} [options.types]
	 * @param {TParameterObject} [options.singletones]
	 */
	constructor({ types = [], singletones = {} } = {}) {
		this._types = [...types];
		this._instances = {};
		this._singletones = singletones;

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
		const instance = this._singletones[id] || this._instances[id] || factory(this);

		if (instanceType === 'single')
			this._singletones[id] = instance;
		else if (instanceType === 'per-container')
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
		// eslint-disable-next-line no-use-before-define
		return new ContainerBuilder({
			types: this._types.filter(t => t.aliases.length),
			singletones: this._singletones
		});
	}
}

class ContainerBuilder {

	/**
	 * @param {object} [options]
	 * @param {TypeConfig[]} [options.types]
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
		return new Container({
			types: this._types,
			singletones: this._singletones
		});
	}
}

module.exports = {
	Container,
	ContainerBuilder
};
