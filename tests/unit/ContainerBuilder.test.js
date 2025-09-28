'use strict';

const { ContainerBuilder, Container } = require('../..');
const { expect } = require('chai');

class X { }

class Y {
	constructor({ x }) {
		this._x = x;
	}
}

describe('ContainerBuilder', () => {

	describe('container', () => {

		it('creates instance of Container', () => {

			/** @type {ContainerBuilder<ITestContainer>} */
			const builder = new ContainerBuilder();
			const container = builder.container();

			expect(container).to.be.instanceOf(Container);
		});

		it('allows container builder extension', () => {

			class ExtendedBuilder extends ContainerBuilder {
			}

			const builder = new ExtendedBuilder();
			const container = builder.container();
			const derivedBuilder = container.builder();

			expect(derivedBuilder).to.be.instanceOf(ExtendedBuilder);
		});
	});

	describe('register', () => {

		it('registers Type in DI container', () => {
			/** @type {ContainerBuilder<ITestContainer>} */
			const builder = new ContainerBuilder();
			builder.register(X, 'x');
			const container = builder.container();

			expect(container.x).to.be.instanceOf(X);
		});

		it('registers factory in DI container', () => {

			/** @type {ContainerBuilder<ITestContainer>} */
			const builder = new ContainerBuilder();
			builder.register(c => new X(), 'x');

			const container = builder.container();

			expect(container.x).to.be.instanceOf(X);
		});

		it('registers types w\\o names and instantiates them on container creation', () => {

			let counter = 0;
			const builder = new ContainerBuilder();
			builder.register(() => {
				counter += 1;
				return {};
			});

			expect(counter).to.eq(0);
			const container = builder.container();
			expect(counter).to.eq(1);
		});

		it('fails if non-function passed as an argument', () => {
			const builder = new ContainerBuilder();

			expect(() => {
				builder.register(/** @type {any} */ ({}));
			}).to.throw(TypeError);
		});

		it('fails if Type constructor has multiple arguments', () => {
			const builder = new ContainerBuilder();

			class Z {
				constructor(x, y) {
				}
			}

			expect(() => {
				builder.register(Z);
			}).to.throw(TypeError);
		});

		it('fails if factory has multiple arguments', () => {
			const builder = new ContainerBuilder();

			const zFact = (a, b) => ({});

			expect(() => {
				builder.register(zFact);
			}).to.throw(TypeError);
		});

		it('fails if alias conflicts with container methods', () => {
			const builder = new ContainerBuilder();
			expect(() => {
				builder.register(c => new X(), 'get');
			}).to.throw(TypeError);
		});
	});
});

