'use strict';

/**
 * @template T
 * @typedef {{ new(c?: Container & { [key: string]: any }): T } | ((c?: Container & { [key: string]: any }) => T)} TClassOrFactory
 */

/**
 * @param {TClassOrFactory<any>} func
 * @returns {boolean}
 */
function isClass(func) {
	return typeof func === 'function'
		&& Function.prototype.toString.call(func).startsWith('class');
}

/**
 * @template TArgs
 * @param {Container} container
 * @param {TArgs & object} additionalParameters
 * @returns {Container & TArgs}
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

		this.id = Symbol(Type.name);
		this.aliases = [];

		/** @type {"single" | "per-dependency" | "per-container"} */
		this.instanceType = 'per-container';

		/** @type {(c: Container) => T} */
		this.factory = container => container.createInstance(Type);
	}

	/**
	 * Instruct to expose object instance on container instance with a given `alias`.
	 * The alias will be used to inject object instance as dependency to other types.
	 *
	 * @param {string} alias
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
	 */
	asSingleInstance() {
		this.instanceType = 'single';
		return this;
	}

	asInstancePerDependency() {
		this.instanceType = 'per-dependency';
		return this;
	}

	asInstancePerContainer() {
		this.instanceType = 'per-container';
		return this;
	}
}

class Container {

	/**
	 * @param {object} [options]
	 * @param {TypeConfig[]} [options.types]
	 * @param {{ [key: string | Symbol]: any }} [options.singletones]
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

		for (const { id, factory } of this._types.filter(t => !t.aliases.length))
			this._instances[id] = factory(this);
	}

	/**
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
	 * @template T
	 * @param {TClassOrFactory<T>} Type
	 * @param {{ [key: string]: any }} [additionalParams]
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
	 * @param {{ [key: string | Symbol]: any }} [options.singletones]
	 */
	constructor({ types = [], singletones = {} } = {}) {
		this._types = [...types];
		this._singletones = singletones;
	}

	/**
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
	 * @template T
	 * @param {T} instance
	 * @param {string} alias
	 */
	registerInstance(instance, alias) {
		const t = new TypeConfig(() => instance)
			.asSingleInstance()
			.as(alias);

		this._types.push(t);
		return t;
	}

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
