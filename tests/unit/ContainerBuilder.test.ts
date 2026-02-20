import { ContainerBuilder, Container } from '../../src';

interface IBuilderTestContainer extends Container {
	x?: X;
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
	});
});
