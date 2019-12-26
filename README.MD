# DI Container & Builder

## Getting Started

```js
class Car {
	/**
	 * Creates instance of Car,
	 * expects 1 parameter object argument with dependencies
	 * 
	 * @param {object} dependencies
	 * @param {Engine} dependencies.engine
	 */
	constructor({ engine }) {
		this._engine = engine;
	}
}

class Engine { }
```

```js
const { ContainerBuilder } = require('di6');

const builder = new ContainerBuilder();

// Give the `Engine` type an alias that will be used for dependency resolving
builder.register(Engine)
	.as('engine')
	.asInstancePerDependency();

const container = builder.container();

const car = container.createInstance(Car); // instanceOf Car
car._engine; // instanceOf Engine
```
