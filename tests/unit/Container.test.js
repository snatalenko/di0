'use strict';

const { ContainerBuilder, Container } = require('../..');
const { expect } = require('chai');

class X { }

class Y {
	constructor({ x, z }) {
		this._x = x;
		this._z = z;
	}
}

describe('Container', () => {

	/** @type {ContainerBuilder} */
	let builder;

	/** @type {Container} */
	let container;

	beforeEach(() => {
		builder = new ContainerBuilder();
		builder.register(X, 'x');

		container = builder.container();
	});

	describe('createInstance', () => {

		it('creates instance of a given type', () => {
			const y = container.createInstance(Y);
			expect(y).to.be.instanceOf(Y);
		});

		it('injects dependencies', () => {
			const y = container.createInstance(Y);
			expect(y).to.have.property('_x').that.is.instanceOf(X);
		});

		it('injects additional parameters', () => {
			const y = container.createInstance(Y, { z: 'test' });
			expect(y).to.have.property('_x').that.is.instanceOf(X);
			expect(y).to.have.property('_z', 'test');
		});

		it('initializes dependencies only when they are needed', () => {
			let fooCreated = false;
			builder.register(() => {
				fooCreated = true;
			}, 'foo');
			container = builder.container();

			expect('foo' in container).to.eq(true);
			expect(fooCreated).to.eq(false);

			container.createInstance(Y);
			expect(fooCreated).to.eq(false);

			container.createInstance(({ foo }) => foo);
			expect(fooCreated).to.eq(true);
		});

		it('injects container methods', () => {

			class Z {
				constructor({ get, getAll, createInstance }) {
					this.x = get('x');
					this.xx = getAll('x');
					this.xi = createInstance(X);
				}
			}

			const z = container.createInstance(Z);
			expect(z).to.have.property('x').that.is.instanceOf(X);
			expect(z).to.have.property('xx').that.eqls([z.x]);
			expect(z).to.have.property('xi').that.is.instanceOf(X);
		});
	});

	describe('builder', () => {

		it('creates a derived builder for container modification', () => {

			const b2 = container.builder();
			b2.register(Y, 'y');
			expect(b2).to.be.instanceOf(ContainerBuilder);

			const c2 = b2.container();
			expect(c2).to.have.property('x').that.is.instanceOf(X);
			expect(c2).to.have.property('y').that.is.instanceOf(Y);

			expect(container).to.have.property('x').that.is.instanceOf(X);
			expect(container).to.not.have.property('y');
		});
	});

	describe('get', () => {

		it('returns instance by alias', () => {

			expect(container.get('x')).to.be.instanceOf(X);
		});

		it('returns instance of a latest registered type with a given alias', () => {

			builder.register(() => 'foo').as('x');
			container = builder.container();

			expect(container.get('x')).to.eq('foo');
		});

		it('detects circular dependencies', () => {

			builder.register(({ a }) => null, 'c');
			builder.register(({ b }) => null, 'a');
			builder.register(({ c }) => null, 'b');
			container = builder.container();

			expect(() => {
				container.get('a');
			}).to.throw('Circular dependency detected: a.b.c.a');
		});

		it('logs instance creations when logger is registered', () => {

			const logs = [];
			builder.register(Y, 'y');
			builder.register(() => ({
				log(...args) {
					logs.push(args);
				}
			}), 'logger');

			container = builder.container();
			container.get('y');

			expect(logs).to.eql([
				['silly', 'y.x instance created'],
				['silly', 'y instance created']
			]);
		});
	});

	describe('getAll', () => {

		it('returns all services registered with a given alias', () => {

			builder.register(() => 1).as('numbers');
			builder.register(() => 2).as('numbers');

			const c = builder.container();
			const numbers = c.getAll('numbers');

			expect(numbers).to.eql([1, 2]);
		});
	});

	describe('[alias: string]', () => {
		it('exposes registered type instances as properties', () => {
			expect(container.x).to.be.instanceOf(X);
		});

		it('does not allow property modifications', () => {
			expect(() => {
				container.x = {};
			}).to.throw(TypeError);
		});
	});

	describe('asInstancePerContainer', () => {

		it('caches created instance within container', () => {

			const x = container.x;

			expect(container.x === x).to.eq(true);
		});

		it('does not pass instance to derived containers', () => {

			const derivedBuilder = container.builder();
			const derivedContainer = derivedBuilder.container();

			expect(container.x === derivedContainer.x).to.eq(false);
		});
	});

	describe('asSingleInstance', () => {

		it('passes created singleton instances to derived container', () => {

			builder.register(Y, 'y').asSingleInstance();

			const parentContainer = builder.container();
			const derivedBuilder = parentContainer.builder();
			const derivedContainer = derivedBuilder.container();

			expect(parentContainer).to.have.property('x').that.is.instanceOf(X);
			expect(derivedContainer).to.have.property('x').that.does.not.eq(parentContainer.x);

			expect(parentContainer).to.have.property('y').that.is.instanceOf(Y);
			expect(derivedContainer).to.have.property('y').that.eq(parentContainer.y);
		});

		it('passes created singleton instances to parent container', () => {

			builder.register(Y).as('y').asSingleInstance();

			const parentContainer = builder.container();
			const derivedBuilder = parentContainer.builder();
			const derivedContainer = derivedBuilder.container();

			expect(derivedContainer).to.have.property('y').that.eq(parentContainer.y);
		});
	});

	describe('asInstancePerDependency', () => {

		it('creates new service instances on every access', () => {

			builder.register(Y).as('y').asInstancePerDependency();

			const c = builder.container();
			const y = c.y;

			expect(c.y === y).to.eq(false);
		});
	});

});
