import { Container } from "./Container";
import { TClassOrFactory } from "./TClassOrFactory";
import { INSTANCE_PER_CONTAINER, INSTANCE_PER_DEPENDENCY, INSTANCE_SINGLE, TInstanceType } from "./TInstanceType";

const FORBIDDEN_ALIASES = [
	Container.prototype.get.name,
	Container.prototype.getAll.name,
	Container.prototype.createInstance.name,
	Container.prototype.has.name
];

function validateAlias(alias: unknown): asserts alias is string {
	if (typeof alias !== 'string' || !alias.length)
		throw new TypeError('Alias argument must be a non-empty String');
	if (FORBIDDEN_ALIASES.includes(alias))
		throw new TypeError(`Alias "${alias}" conflicts with container method`);
}

export class TypeConfig<T, TContainerInterface = any> {

	/** Unique type configuration identifier */
	readonly id: symbol;

	/** List of type aliases */
	readonly aliases: string[] = [];

	/** Aliases for which the container property should return an array of all instances */
	readonly collectionAliases: Set<string> = new Set();

	/** How to instantiate the type */
	instanceType: TInstanceType = INSTANCE_PER_CONTAINER;

	/** Type instance factory */
	readonly factory: (container: TContainerInterface & Container) => T;

	/**
	 * Creates an instance of TypeConfig<T>
	 */
	constructor(Type: TClassOrFactory<T, TContainerInterface>) {
		if (typeof Type !== 'function')
			throw new TypeError('Type argument must be a Function');
		if (Type.length > 1)
			throw new TypeError('Type cannot have more than 1 argument');

		this.id = Symbol(Type.name);
		this.factory = container => container.createInstance(Type);
	}

	/**
	 * Instruct to expose object instance on container instance with a given `alias`.
	 * The alias will be used to inject object instance as dependency to other types.
	 */
	as(alias: keyof TContainerInterface): TypeConfig<T, TContainerInterface> {
		validateAlias(alias);

		if (this.aliases.includes(alias as string))
			throw new TypeError(`Alias "${alias}" is already registered for the type`);

		this.aliases.push(alias as string);
		return this;
	}

	/**
	 * Instruct to expose object instance on container as one element of an array under the given `alias`.
	 * Multiple registrations with the same alias accumulate into the array.
	 */
	asOneOf(alias: keyof TContainerInterface): TypeConfig<T, TContainerInterface> {
		validateAlias(alias);

		if (!this.aliases.includes(alias as string))
			this.aliases.push(alias as string);

		this.collectionAliases.add(alias as string);
		return this;
	}

	/**
	 * Instruct to create object instances once per containers tree
	 * (current container and derived containers)
	 */
	asSingleInstance(): TypeConfig<T, TContainerInterface> {
		this.instanceType = INSTANCE_SINGLE;
		return this;
	}

	/**
	 * Create instance per each dependency
	 */
	asInstancePerDependency(): TypeConfig<T, TContainerInterface> {
		this.instanceType = INSTANCE_PER_DEPENDENCY;
		return this;
	}

	/**
	 * Create instance per container (default behavior)
	 */
	asInstancePerContainer(): TypeConfig<T, TContainerInterface> {
		this.instanceType = INSTANCE_PER_CONTAINER;
		return this;
	}
}
