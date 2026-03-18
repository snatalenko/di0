import { ContainerBuilder, Container } from '../../src';
import { CircularDependencyError, AmbiguousResolverError } from '../../src/errors/index.ts';

interface ITestContainer extends Container {
	x: X;
	y?: Y;
	a?: any;
	b?: any;
	c?: any;
	numbers?: any;
	engines?: any[];
	engine?: any;
	car?: any;
	foo?: any;
	logger?: any;
}

class X { }

class Y {
	_x: X;
	_z: unknown;

	constructor({ x, z }: { x: X; z?: unknown }) {
		this._x = x;
		this._z = z;
	}
}

describe('Container', () => {

	let builder: ContainerBuilder<ITestContainer>;
	let container: ITestContainer;

	beforeEach(() => {
		builder = new ContainerBuilder();
		builder.register(X, 'x');
		container = builder.container();
	});

	describe('createInstance', () => {

		it('creates instance of a given type', () => {
			const y = container.createInstance(Y);
			expect(y).toBeInstanceOf(Y);
		});

		it('injects dependencies', () => {
			const y = container.createInstance(Y);
			expect(y._x).toBeInstanceOf(X);
		});

		it('injects additional parameters', () => {
			const y = container.createInstance(Y, { z: 'test' });
			expect(y._x).toBeInstanceOf(X);
			expect(y._z).toBe('test');
		});

		it('initializes dependencies only when they are needed', () => {
			let fooCreated = false;
			builder.register(() => {
				fooCreated = true;
			}, 'foo');
			container = builder.container();

			expect('foo' in container).toBe(true);
			expect(fooCreated).toBe(false);

			container.createInstance(Y);
			expect(fooCreated).toBe(false);

			container.createInstance(({ foo }: ITestContainer) => foo);
			expect(fooCreated).toBe(true);
		});

		it('injects container methods', () => {

			class Z {
				x: object;
				xx: object[];
				xi: X;

				constructor({ get, getAll, createInstance }: ITestContainer) {
					this.x = get('x');
					this.xx = getAll('x');
					this.xi = createInstance(X);
				}
			}

			const z = container.createInstance(Z);
			expect(z.x).toBeInstanceOf(X);
			expect(z.xx).toEqual([z.x]);
			expect(z.xi).toBeInstanceOf(X);
		});
	});

	describe('builder', () => {

		it('creates a derived builder for container modification', () => {

			const b2 = container.builder();
			b2.register(Y, 'y');
			expect(b2).toBeInstanceOf(ContainerBuilder);

			const c2 = b2.container();
			expect(c2.x).toBeInstanceOf(X);
			expect(c2.y).toBeInstanceOf(Y);

			expect(container.x).toBeInstanceOf(X);
			expect(container).not.toHaveProperty('y');
		});
	});

	describe('get', () => {

		it('returns instance by alias', () => {
			expect(container.get('x')).toBeInstanceOf(X);
		});

		it('returns instance of a latest registered type with a given alias', () => {

			builder.register(() => 'foo' as any).as('x');
			container = builder.container();

			expect(container.get('x')).toBe('foo');
		});

		it('detects circular dependencies', () => {

			builder.register(({ a: _a }: ITestContainer) => null as any, 'c');
			builder.register(({ b: _b }: ITestContainer) => null as any, 'a');
			builder.register(({ c: _c }: ITestContainer) => null as any, 'b');
			container = builder.container();

			expect(() => {
				container.get('a');
			}).toThrowError(CircularDependencyError);

			expect(() => {
				container.get('a');
			}).toThrow('Circular dependency detected: a.b.c.a');
		});

		it('logs instance creations when logger is registered', () => {

			const logs: any[][] = [];
			builder.register(Y, 'y');
			builder.register(() => ({
				log(...args: any[]) {
					logs.push(args);
				}
			}), 'logger');

			container = builder.container();
			container.get('y');

			expect(logs).toEqual([
				['silly', 'y.x instance created'],
				['silly', 'y instance created']
			]);
		});

		it('caches falsy values', () => {

			let created = 0;
			builder.register(() => {
				created++;
				return 0 as any;
			}, 'foo');
			container = builder.container();

			expect(container.foo).toBe(0);
			expect(container.foo).toBe(0);
			expect(created).toBe(1);
		});

		it('caches undefined values', () => {

			let created = 0;
			builder.register(() => {
				created++;
				return undefined as any;
			}, 'foo');
			container = builder.container();

			expect(container.foo).toBeUndefined();
			expect(container.foo).toBeUndefined();
			expect(created).toBe(1);
		});
	});

	describe('has', () => {

		it('returns true when alias is registered', () => {
			expect(container.has('x')).toBe(true);
		});

		it('returns false when alias is not registered', () => {
			expect(container.has('missing')).toBe(false);
		});

		it('accepts type identifiers', () => {
			const config = builder.register(() => ({}));
			container = builder.container();

			expect(container.has(config.id)).toBe(true);
		});

		it('does not instantiate services', () => {
			let instantiated = false;
			builder.register(() => {
				instantiated = true;
			}, 'foo');
			container = builder.container();

			expect(container.has('foo')).toBe(true);
			expect(instantiated).toBe(false);

			container.get('foo');
			expect(instantiated).toBe(true);
		});

		it('throws when alias argument is missing', () => {
			expect(() => {
				container.has(undefined as any);
			}).toThrow('alias argument required');
		});
	});

	describe('getAll', () => {

		it('returns all services registered with a given alias', () => {

			builder.register(() => 1 as any).as('numbers');
			builder.register(() => 2 as any).as('numbers');

			const c = builder.container();
			const numbers = c.getAll('numbers');

			expect(numbers).toEqual([1, 2]);
		});
	});

	describe('[alias: string]', () => {

		it('exposes registered type instances as properties', () => {
			expect(container.x).toBeInstanceOf(X);
		});

		it('does not allow property modifications', () => {
			expect(() => {
				(container as any).x = {};
			}).toThrow(TypeError);
		});
	});

	describe('asInstancePerContainer', () => {

		it('caches created instance within container', () => {

			const x = container.x;
			expect(container.x === x).toBe(true);
		});

		it('does not pass instance to derived containers', () => {

			const derivedBuilder = container.builder();
			const derivedContainer = derivedBuilder.container();

			expect(container.x === derivedContainer.x).toBe(false);
		});

		it('creates a separate instance for each builder.container() call', () => {

			const c1 = builder.container();
			const c2 = builder.container();

			expect(c1.x).toBeInstanceOf(X);
			expect(c2.x).toBeInstanceOf(X);
			expect(c1.x).not.toBe(c2.x);
		});

		it('overrides a previously set singleton lifetime', () => {

			builder.register(Y).as('y').asSingleInstance().asInstancePerContainer();

			const c1 = builder.container();
			const c2 = builder.container();

			expect(c1.y).toBeInstanceOf(Y);
			expect(c2.y).toBeInstanceOf(Y);
			expect(c1.y).not.toBe(c2.y);
		});
	});

	describe('asSingleInstance', () => {

		it('passes created singleton instances to derived container', () => {

			builder.register(Y, 'y').asSingleInstance();

			const parentContainer = builder.container();
			const derivedBuilder = parentContainer.builder();
			const derivedContainer = derivedBuilder.container();

			expect(parentContainer.x).toBeInstanceOf(X);
			expect(derivedContainer.x).not.toBe(parentContainer.x);

			expect(parentContainer.y).toBeInstanceOf(Y);
			expect(derivedContainer.y).toBe(parentContainer.y);
		});

		it('passes created singleton instances to parent container', () => {

			builder.register(Y).as('y').asSingleInstance();

			const parentContainer = builder.container();
			const derivedBuilder = parentContainer.builder();
			const derivedContainer = derivedBuilder.container();

			expect(derivedContainer.y).toBe(parentContainer.y);
		});

		it('shares singleton instances across multiple builder.container() calls', () => {

			let callCount = 0;
			builder.register((_: any) => { callCount++; return new X(); }).asSingleInstance().as('x' as any);

			const c1 = builder.container();
			const c2 = builder.container();

			expect(c1.x).toBeInstanceOf(X);
			expect(c2.x).toBeInstanceOf(X);
			expect(c1.x).toBe(c2.x);
			expect(callCount).toBe(1);
		});
	});

	describe('asInstancePerDependency', () => {

		it('creates new service instances on every access', () => {

			builder.register(Y).as('y').asInstancePerDependency();

			const c = builder.container();
			const y = c.y;

			expect(c.y === y).toBe(false);
		});
	});

	describe('asOneOf', () => {

		it('produces an array with a single element for one registration', () => {

			builder.register(X).asOneOf('engines');
			const c = builder.container();

			expect(c.engines).toEqual([expect.any(X)]);
		});

		it('accumulates multiple registrations into an array', () => {

			builder.register(X).asOneOf('engines');
			builder.register(X).asOneOf('engines');
			const c = builder.container();

			expect(c.engines).toHaveLength(2);
			expect(c.engines![0]).toBeInstanceOf(X);
			expect(c.engines![1]).toBeInstanceOf(X);
		});

		it('returns a fresh array on each access when asInstancePerDependency', () => {

			builder.register(X).asOneOf('engines').asInstancePerDependency();
			const c = builder.container();

			const first = c.engines![0];
			const second = c.engines![0];
			expect(first).not.toBe(second);
		});

		it('returns the same instances on each access with default lifetime', () => {

			builder.register(X).asOneOf('engines');
			const c = builder.container();

			expect(c.engines![0]).toBe(c.engines![0]);
		});

		it('shares singleton instances with derived containers', () => {

			builder.register(X).asOneOf('engines').asSingleInstance();
			const parent = builder.container();
			const child = parent.builder().container();

			expect((parent.engines as X[])[0]).toBe((child.engines as X[])[0]);
		});

		it('has() returns true for collection alias', () => {

			builder.register(X).asOneOf('engines');
			const c = builder.container();

			expect(c.has('engines')).toBe(true);
		});

		it('child container includes parent and own registrations', () => {

			builder.register(X).asOneOf('engines');
			const parent = builder.container();

			const childBuilder = parent.builder();
			childBuilder.register(X).asOneOf('engines');
			const child = childBuilder.container();

			expect(child.engines).toHaveLength(2);
		});

		it('throws when the same alias is used with both .as() and .asOneOf()', () => {

			builder.register(X).as('engines' as any);
			builder.register(X).asOneOf('engines');

			expect(() => builder.container()).toThrow(
				'Alias "engines" is registered with both .as() and .asOneOf() — use one or the other'
			);
		});
	});

	describe('addResolver', () => {

		it('validates resolver alias', () => {

			expect(() => {
				builder.addResolver(() => true, '' as any);
			}).toThrow('Alias argument must be a non-empty String');

			expect(() => {
				builder.addResolver(() => true, 'get' as any);
			}).toThrow('Alias "get" conflicts with container method');
		});

		it('resolves a single matching unaliased type by predicate', () => {

			builder.addResolver(i => i instanceof X, 'engine');
			builder.register(X);
			const c = builder.container();

			expect(c.engine).toBeInstanceOf(X);
		});

		it('is order-independent: dependent registered before its dep', () => {

			class Engine { }
			class Car {
				engine: Engine;
				constructor({ engine }: { engine: Engine }) {
					this.engine = engine;
				}
			}

			builder.addResolver(i => i instanceof Engine, 'engine');
			builder.register(Car).as('car'); // aliased = lazy, so Engine is ready when car is accessed
			builder.register(Engine);
			const c = builder.container();

			expect(c.car).toBeInstanceOf(Car);
			expect((c.car as Car).engine).toBeInstanceOf(Engine);
		});

		it('resolves via Object.create prototype scan when the type is not yet instantiated', () => {

			class Engine { }
			class Car {
				engine: Engine;
				constructor({ engine }: { engine: Engine }) {
					this.engine = engine;
				}
			}

			builder.addResolver(i => i instanceof Engine, 'engine');
			builder.register(Car);    // unaliased — eagerly constructed first, before Engine is in instances
			builder.register(Engine); // unaliased — not yet in instances when Car is being constructed

			const c = builder.container();

			// Engine was resolved via Object.create(Engine.prototype) during Car's eager construction
			expect((c as any).engine).toBeInstanceOf(Engine);
		});

		it('type factory can access resolver-resolved dependency', () => {

			class Engine { }
			class Car {
				engine: Engine;
				constructor({ engine }: { engine: Engine }) {
					this.engine = engine;
				}
			}

			builder.addResolver(i => i instanceof Engine, 'engine');
			builder.addResolver(i => i instanceof Car, 'car');
			builder.register(Engine);
			builder.register(Car);
			const c = builder.container();

			expect((c.car as Car).engine).toBeInstanceOf(Engine);
		});

		it('caches the resolved instance', () => {

			builder.addResolver(i => i instanceof X, 'engine');
			builder.register(X);
			const c = builder.container();

			expect(c.engine).toBe(c.engine);
		});

		it('has() returns true for resolver alias when a matching unaliased type is cached', () => {

			// Unaliased types are eagerly initialized, so the instance is in cache immediately
			builder.addResolver(i => i instanceof X, 'engine');
			builder.register(X);
			const c = builder.container();

			expect(c.has('engine')).toBe(true);
		});

		it('has() returns undefined for resolver alias when no cached instance matches the predicate', () => {

			builder.addResolver(i => i instanceof X, 'engine');
			builder.register(Y); // Y does not match the predicate
			const c = builder.container();

			expect(c.has('engine')).toBeUndefined();
		});

		it('has() returns undefined for resolver alias when no unaliased type is registered', () => {

			builder.addResolver(i => i instanceof X, 'engine');
			const c = builder.container();

			expect(c.has('engine')).toBeUndefined();
		});

		it('has() returns false for unregistered alias', () => {

			const c = builder.container();

			expect(c.has('engine')).toBe(false);
		});

		it('returns undefined when no unaliased type matches the predicate', () => {

			builder.addResolver(i => i instanceof X, 'engine');
			builder.register(Y);
			const c = builder.container();

			expect(c.engine).toBeUndefined();
		});

		it('does not match an unaliased factory function via prototype scan even when predicate returns true', () => {

			// Factories have no meaningful prototype — #findPrototypesByPredicate skips them via !isClass.
			// The factory must be unaliased (eager) and registered after the dependent so that it
			// is not yet in #instances when the prototype scan runs during the dependent's construction.
			class Dependent {
				engine: any;
				constructor({ engine }: any) { this.engine = engine; }
			}

			builder.addResolver(() => true, 'engine');
			const depConfig = builder.register(Dependent); // eager, constructed first
			builder.register(() => ({})); // unaliased factory — not a class, not yet instantiated

			const c = builder.container();

			// During Dependent's eager construction, the factory was not yet in instances
			// and was skipped by !isClass in the prototype scan → engine received undefined
			expect((c.get(depConfig.id) as Dependent).engine).toBeUndefined();
		});

		it('throws when multiple unaliased types match the predicate', () => {

			builder.addResolver(i => i instanceof X, 'engine');
			builder.register(X);
			builder.register(X);
			const c = builder.container();

			expect(() => c.engine).toThrowError(AmbiguousResolverError);

			expect(() => c.engine).toThrow(
				'Multiple types matched resolver for alias "engine" (X, X): use .as() to disambiguate'
			);
		});

		it('throws without class names when matched instances have no constructor name', () => {

			builder.addResolver(() => true, 'engine');
			builder.register(() => Object.create(null));
			builder.register(() => Object.create(null));
			const c = builder.container();

			expect(() => c.engine).toThrow(
				'Multiple types matched resolver for alias "engine": use .as() to disambiguate'
			);
		});

		it('explicit .as() alias takes precedence over resolver for the same alias', () => {

			builder.register(X, 'engine' as any);
			builder.addResolver(i => i instanceof X, 'engine');
			const c = builder.container();

			// explicit registration wins; resolver is not consulted
			expect(c.engine).toBeInstanceOf(X);
		});

		it('explicit .asOneOf() alias takes precedence over resolver for the same alias', () => {

			builder.register(X).asOneOf('engines');
			builder.addResolver(i => i instanceof X, 'engines');
			const c = builder.container();

			// explicit collection registration wins; resolver is not consulted
			expect(c.engines).toBeInstanceOf(Array);
		});

		it('resolves to instance after construction even if engine was undefined during self-construction', () => {

			class A {
				engine: any;
				constructor({ engine }: ITestContainer) { this.engine = engine; }
			}

			builder.addResolver(i => i instanceof A, 'engine');
			builder.register(A);

			// During A's eager init, #inProgress skips A → resolver returns undefined → A.engine is undefined.
			// After construction, resolver finds A (no longer in-progress) → c.engine is the A instance.
			const c = builder.container();
			expect((c as any).engine).toBeInstanceOf(A);
			expect((c as any).engine.engine).toBeUndefined();
		});

		it('singleton resolver-matched instance propagates to derived container', () => {

			builder.addResolver(i => i instanceof X, 'engine');
			builder.register(X).asSingleInstance();
			const parent = builder.container();

			const child = parent.builder().container();

			expect(parent.engine).toBe(child.engine);
		});

		it('per-container resolver resolves independently in derived container', () => {

			builder.addResolver(i => i instanceof X, 'engine');
			builder.register(X);
			const parent = builder.container();

			// child inherits the parent's unaliased X via the resolver-aware type pass-through
			const child = parent.builder().container();

			expect(parent.engine).not.toBe(child.engine);
		});
	});
});
