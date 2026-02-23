import { ContainerBuilder, Container } from '../../src';

interface IBuilderTestContainer extends Container {
	x?: X;
	y?: Y;
}

class X {}

class Y {
	_x: X;

	constructor({ x }: { x: X }) {
		this._x = x;
	}
}

describe('ContainerBuilder', () => {

	describe('container', () => {

		it('creates instance of Container', () => {

			const builder = new ContainerBuilder();
			const container = builder.container();

			expect(container).toBeInstanceOf(Container);
		});

		it('allows container builder extension', () => {

			class ExtendedBuilder extends ContainerBuilder {}

			const builder = new ExtendedBuilder();
			const container = builder.container();
			const derivedBuilder = container.builder();

			expect(derivedBuilder).toBeInstanceOf(ExtendedBuilder);
		});
	});

	describe('register', () => {

		it('registers Type in DI container', () => {
			const builder = new ContainerBuilder<IBuilderTestContainer>();
			builder.register(X, 'x');
			const container = builder.container();

			expect(container.x).toBeInstanceOf(X);
		});

		it('registers factory in DI container', () => {

			const builder = new ContainerBuilder<IBuilderTestContainer>();
			builder.register(() => new X(), 'x');

			const container = builder.container();

			expect(container.x).toBeInstanceOf(X);
		});

		it('registers types without names and instantiates them on container creation', () => {

			let counter = 0;
			const builder = new ContainerBuilder();
			builder.register(() => {
				counter += 1;
				return {};
			});

			expect(counter).toBe(0);
			builder.container();
			expect(counter).toBe(1);
		});

		it('fails if non-function passed as an argument', () => {
			const builder = new ContainerBuilder();

			expect(() => {
				builder.register({} as any);
			}).toThrow(TypeError);
		});

		it('fails if Type constructor has multiple arguments', () => {
			const builder = new ContainerBuilder();

			class Z {
				constructor(_x: unknown, _y: unknown) {}
			}

			expect(() => {
				builder.register(Z as any);
			}).toThrow(TypeError);
		});

		it('fails if factory has multiple arguments', () => {
			const builder = new ContainerBuilder();

			const zFact = (_a: unknown, _b: unknown) => ({});

			expect(() => {
				builder.register(zFact as any);
			}).toThrow(TypeError);
		});

		it('fails if alias conflicts with container methods', () => {
			const builder = new ContainerBuilder();
			expect(() => {
				builder.register(() => new X(), 'get' as any);
			}).toThrow(TypeError);
		});

		it('throws when .as() is called twice with the same alias on the same registration', () => {
			const builder = new ContainerBuilder<IBuilderTestContainer>();
			expect(() => {
				builder.register(X).as('x').as('x');
			}).toThrow('Alias "x" is already registered for the type');
		});
	});

	describe('registerInstance', () => {

		it('returns the exact instance provided', () => {
			const builder = new ContainerBuilder<IBuilderTestContainer>();
			const x = new X();
			builder.registerInstance(x, 'x');
			const container = builder.container();

			expect(container.x).toBe(x);
		});

		it('makes the instance injectable into other types', () => {
			const builder = new ContainerBuilder<IBuilderTestContainer>();
			const x = new X();
			builder.registerInstance(x, 'x');
			builder.register(Y, 'y');
			const container = builder.container();

			expect((container.y as Y)._x).toBe(x);
		});

		it('shares the instance across derived containers', () => {
			const builder = new ContainerBuilder<IBuilderTestContainer>();
			const x = new X();
			builder.registerInstance(x, 'x');
			const parent = builder.container();
			const child = parent.builder().container();

			expect(child.x).toBe(parent.x);
		});

		it('returns a TypeConfig for further configuration', () => {
			const builder = new ContainerBuilder<IBuilderTestContainer>();
			const x = new X();
			const config = builder.registerInstance(x, 'x');

			expect(typeof config.as).toBe('function');
		});
	});
});
