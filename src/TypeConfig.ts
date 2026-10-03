import type { ClassOrFactory } from "./ClassOrFactory.ts";
import {
	INSTANCE_PER_CONTAINER,
	INSTANCE_PER_DEPENDENCY,
	INSTANCE_SINGLE,
	type LifetimeMode
} from "./LifetimeMode.ts";
import { assertAlias, assertFunction } from "./assert.ts";

export class TypeConfig<T, TContainerInterface = any> {

	/** Unique type configuration identifier */
	readonly id: symbol;

	/** List of type aliases */
	readonly aliases: string[] = [];

	/** Aliases for which the container property should return an array of all instances */
	readonly collectionAliases: Set<string> = new Set();

	/** Aliases exposing values derived from the type instance, with their selectors */
	readonly exposedAliases: Map<string, (instance: T) => unknown> = new Map();

	/** How to instantiate the type */
	instanceType: LifetimeMode = INSTANCE_PER_CONTAINER;

	/** Whether the type is exposed on container under any alias, directly or through derived values */
	get hasAliases(): boolean {
		return this.aliases.length > 0 || this.exposedAliases.size > 0;
	}

	/** The registered class constructor or factory function */
	readonly type: ClassOrFactory<T, TContainerInterface>;

	/**
	 * Creates an instance of TypeConfig<T>
	 */
	constructor(Type: ClassOrFactory<T, TContainerInterface>) {
		assertFunction(Type, 'Type');
		if (Type.length > 1)
			throw new TypeError('Type cannot have more than 1 argument');

		this.id = Symbol(Type.name);
		this.type = Type;
	}

	/**
	 * Instruct to expose object instance on container instance with a given `alias`.
	 * The alias will be used to inject object instance as dependency to other types.
	 */
	as(alias: keyof TContainerInterface): TypeConfig<T, TContainerInterface> {
		assertAlias(alias);

		if (this.aliases.includes(alias as string) || this.exposedAliases.has(alias as string))
			throw new TypeError(`Alias "${alias}" is already registered for the type`);

		this.aliases.push(alias as string);
		return this;
	}

	/**
	 * Instruct to expose object instance on container as one element of an array under the given `alias`.
	 * Multiple registrations with the same alias accumulate into the array.
	 */
	asOneOf(alias: keyof TContainerInterface): TypeConfig<T, TContainerInterface> {
		assertAlias(alias);

		if (this.exposedAliases.has(alias as string))
			throw new TypeError(`Alias "${alias}" is already registered for the type`);

		if (!this.aliases.includes(alias as string))
			this.aliases.push(alias as string);

		this.collectionAliases.add(alias as string);
		return this;
	}

	/**
	 * Instruct to expose a value derived from the object instance on container with a given `alias`.
	 * Multiple aliases can be exposed from the same registration, all derived from the same instance.
	 *
	 * @example
	 * builder.register(Projection)
	 *   .exposes(p => p.view, 'usersView')
	 *   .exposes(p => p.eventTracker, 'usersViewTracker')
	 *   .asSingleInstance();
	 */
	exposes<K extends keyof TContainerInterface>(
		selector: (instance: T) => TContainerInterface[K],
		alias: K
	): TypeConfig<T, TContainerInterface> {
		assertFunction(selector, 'Selector');
		assertAlias(alias);
		if (this.instanceType === INSTANCE_PER_DEPENDENCY)
			throw new TypeError('Values cannot be exposed from instance-per-dependency registrations');

		if (this.aliases.includes(alias as string) || this.exposedAliases.has(alias as string))
			throw new TypeError(`Alias "${alias}" is already registered for the type`);

		this.exposedAliases.set(alias as string, selector);
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
		if (this.exposedAliases.size)
			throw new TypeError('Values cannot be exposed from instance-per-dependency registrations');

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
