# Contributing

## Commands

```bash
npm run build          # Compile TypeScript (src/ → dist/)
npm test               # Run unit tests with Jest
npm run test:coverage  # Run tests with lcov coverage report
npm run cleanup        # Delete dist/ build output
```

Run a single test file:
```bash
npx jest tests/unit/Container.test.ts
```

## Architecture

Source is TypeScript in `src/`, compiled to `dist/` (the published `main`). Tests are TypeScript (Jest + ts-jest) in `tests/unit/`. ts-jest compiles tests directly from source — no build step required before running tests.

### Core flow

1. `ContainerBuilder` collects `TypeConfig` registrations.
2. `builder.container()` freezes the type list and instantiates a `Container`.
3. `Container` defines a lazy getter per alias — instances are created on first access.
4. Types registered without an alias are instantiated eagerly at container creation (side-effect initializers).

### Key classes

- **`ContainerBuilder<TContainerInterface>`** (`src/ContainerBuilder.ts`) — fluent builder. Can be subclassed; `container.builder()` returns an instance of the same subclass so derived containers use the correct type.
- **`Container`** (`src/Container.ts`) — resolves aliases to instances. Tracks active resolutions in `_dependencyStack` to detect cycles. Binds its own methods (`get`, `getAll`, `createInstance`, `has`) and injects them as properties so they are available inside constructors and factories.
- **`TypeConfig<T>`** (`src/TypeConfig.ts`) — holds the factory, alias list, and lifetime mode. Returned by `builder.register()` for fluent chaining.

### Instance lifetime internals

Lifetimes are stored as a `TInstanceType` string on `TypeConfig`:

- `INSTANCE_PER_CONTAINER` (default) — cached in `Container#instances`, scoped to the current container.
- `INSTANCE_SINGLE` — cached in the `singletons` object, which is passed through `builderFactory` and shared across the container tree.
- `INSTANCE_PER_DEPENDENCY` — not cached; factory is called on every access.

### Container inheritance

`container.builder()` calls `builderFactory({ singletons })`, producing a new builder of the same class seeded with:
- all aliased `TypeConfig` entries from the parent (anonymous initializers are excluded), and
- the shared `singletons` map.

Registering additional types on the derived builder and calling `.container()` creates a child container that sees both parent and new services.

## Conventions & Gotchas

- Always edit `src/` — `dist/` is compiled output published to npm.
- The `singletons` spelling (not "singletons") is intentional throughout the codebase — do not rename.
- Aliases must not clash with `Container` method names (`get`, `getAll`, `createInstance`, `has`); this is enforced in `TypeConfig.as()`.
- `Container` binds its own methods in the constructor so they can be destructured inside user constructors/factories — account for this when adding new public methods.
