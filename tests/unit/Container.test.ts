import { ContainerBuilder, Container } from '../../src';

interface ITestContainer extends Container {
	x: X;
	y?: Y;
	a?: any;
	b?: any;
	c?: any;
	numbers?: any;
	engines?: any[];
	foo?: any;
	logger?: any;
}

class X {}

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

			builder.register(({ a }: ITestContainer) => null as any, 'c');
			builder.register(({ b }: ITestContainer) => null as any, 'a');
			builder.register(({ c }: ITestContainer) => null as any, 'b');
			container = builder.container();

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
});
