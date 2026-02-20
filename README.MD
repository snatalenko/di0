# di0 — Dependency Injection for ES6+

[![Version](https://img.shields.io/npm/v/di0.svg)](https://www.npmjs.com/package/di0)
[![Downloads](https://img.shields.io/npm/dm/di0.svg)](https://www.npmjs.com/package/di0)
[![Coverage](https://coveralls.io/repos/github/snatalenko/di0/badge.svg)](https://coveralls.io/github/snatalenko/di0)
[![License](https://img.shields.io/github/license/snatalenko/di0.svg)](https://github.com/snatalenko/di0)

Zero-config DI container. Register classes or factories by alias; dependencies are injected automatically via constructor destructuring.

## Install

```bash
npm install di0
```

## Quick Start

```js
const { ContainerBuilder } = require('di0');

class Engine {}

class Car {
  constructor({ engine }) {
    this.engine = engine;
  }
}

const builder = new ContainerBuilder();
builder.register(Engine).as('engine');
builder.register(Car).as('car');

const container = builder.container();
container.car.engine instanceof Engine; // true
```

## Factories

Register a factory function instead of a class:

```js
builder.register(({ engine }) => new Car(engine), 'car');
```

## Instance Lifetimes

| Method | Behavior |
|---|---|
| `.asInstancePerContainer()` | **Default.** One instance per container. |
| `.asSingleInstance()` | One instance shared across parent and all derived containers. |
| `.asInstancePerDependency()` | New instance on every access. |

```js
builder.register(Engine).as('engine').asSingleInstance();
```

## Container API

```js
container.engine;                          // get by alias (lazy)
container.get('engine');                   // same as above
container.getAll('plugin');                // all registrations under alias
container.has('engine');                   // check without instantiating
container.createInstance(Car, { extra });  // instantiate with extra deps
```

## Collections (`asOneOf`)

Register multiple types under the same alias to expose them as an array:

```js
builder.register(GasEngine).asOneOf('engines');
builder.register(ElectricEngine).asOneOf('engines');

const container = builder.container();
container.engines; // [GasEngine instance, ElectricEngine instance]
```

Works with all instance lifetimes and container inheritance — child containers include parent registrations.

## Auto-wiring (`addResolver`)

Register a predicate to automatically wire unaliased types to an alias. The predicate receives an instance; exactly one type must match — multiple matches throw.

```js
builder.addResolver(i => i instanceof Engine, 'engine');
builder.addResolver(i => 'wheels' in i, 'car');

builder.register(Engine);
builder.register(Car); // Car: constructor({ engine }) { ... }

const { car, engine } = builder.container();
```

Registration order does not matter. Singleton resolver-matched instances propagate to derived containers.

## Container Inheritance

Derive a child container that shares singletons with its parent:

```js
const child = container.builder()
  .register(Plugin).as('plugin')
  .container();

// child has all parent services + Plugin
// singletons from parent are reused
```

## Initializers (Side Effects)

Register without an alias to run code eagerly when the container is created:

```js
builder.register(({ db }) => db.connect());  // no .as() — runs on container()
```

## Logging

Register a `logger` alias to trace instantiation:

```js
builder.register(() => console, 'logger');
// logs: "engine instance created", "car.engine instance created", …
```

The logger must implement `{ log(level, message) }`.
