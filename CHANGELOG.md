# [1.3.0-1](https://github.com/snatalenko/di0/compare/v1.3.0-0...v1.3.0-1) (2026-02-21)


### Build System

* Enable native Node.js type stripping support ([89bfbc2](https://github.com/snatalenko/di0/commit/89bfbc250f6e0cc3f7ac22cadeb911c09bb6800f))
* Add separate ESM/CJS builds ([8e519f8](https://github.com/snatalenko/di0/commit/8e519f81c7607f5283393e8896c96a28f68587b1))


# [1.3.0-0](https://github.com/snatalenko/di0/compare/v1.2.0...v1.3.0-0) (2026-02-20)


### Features

* `addResolver` for automatic wiring later registered types ([cf9dfff](https://github.com/snatalenko/di0/commit/cf9dfff48acb72799a9021e0e283a7dbc311810d))
* `asOneOf` method for registering multiple types under the same alias ([1fede25](https://github.com/snatalenko/di0/commit/1fede25bf63489adbfe37306c3e44241123abcf9))

### Documentation

* Remove gotchas section from CONTRIBUTING.md ([5e95203](https://github.com/snatalenko/di0/commit/5e952032ca3085e142f03f373e9748c91023646f))
* Update README.md, add CONTRIBUTING.md, change license to Apache-2.0 ([55536dc](https://github.com/snatalenko/di0/commit/55536dc261b3a4f979ac15329c878f6a63117201))

### Tests

* Use Jest instead of Mocha and Nyc ([dba8c6a](https://github.com/snatalenko/di0/commit/dba8c6a8d431c63442a61d73c607bfa135322984))

### Build System

* Cleanup obsolete tags on new version creation ([b9f2382](https://github.com/snatalenko/di0/commit/b9f2382694e08a82f46d53b0e8f31b9e538c1f9b))
* Add GitHub Actions workflow for publishing to NPM ([c39aaa3](https://github.com/snatalenko/di0/commit/c39aaa382eff49a2e092e5fa15dbecf163bf825b))
* Add audit, tests, and coveralls build actions ([f33baa2](https://github.com/snatalenko/di0/commit/f33baa23e40ae7fcf083895603cb1a5671809349))


# [1.2.0](https://github.com/snatalenko/di0/compare/v1.1.0...v1.2.0) (2025-10-13)


### Changes

* Enhance type safety in Container and ContainerBuilder with generics ([4f0d3b9](https://github.com/snatalenko/di0/commit/4f0d3b99c9c38dae885a4b886fc484c0d1ebb3fc))


# [1.1.0](https://github.com/snatalenko/di0/compare/v1.0.0...v1.1.0) (2025-09-28)


### Features

* Add `has` method on Container for type existence check ([6d90d11](https://github.com/snatalenko/di0/commit/6d90d1144b741dfc21f2323229d1e943ee7a5c86))
* Add container typing option as generic ContainerBuilder parameter ([c72e515](https://github.com/snatalenko/di0/commit/c72e5156fc0e677c9a2e2eb1b604f0dbe2958820))

### Build System

* Update test dependencies ([d2f35cd](https://github.com/snatalenko/di0/commit/d2f35cd28eb6d57099fa0a0826bfa54a42da449c))
* Upgrade typescript to v5.9.2 ([0278900](https://github.com/snatalenko/di0/commit/027890049354ae550e1ddd7ecce92cc3707f8b22))
* Add cleanup script ([de3aa25](https://github.com/snatalenko/di0/commit/de3aa25f96dff71bb7b14761ec2ddfbfa63fcbee))


# [1.0.0](https://github.com/snatalenko/di0/compare/v0.5.0...v1.0.0) (2022-02-10)


### Fixes

* Vulnerabilities in dev dependencies ([7a7ca30](https://github.com/snatalenko/di0/commit/7a7ca30b606f935b374c7ab2bc86f1d04759937d))

### Refactoring

* Rewrite using TypeScript ([94dbf59](https://github.com/snatalenko/di0/commit/94dbf59df16c980c387b9c63d54ff5816fda57b8))

### Build System

* Use full sources for typing ([12a2e4b](https://github.com/snatalenko/di0/commit/12a2e4bd889c779e93163eb28c24a7fd15b59657))



# [0.5.0](https://github.com/snatalenko/di0/compare/v0.4.0...v0.5.0) (2020-01-10)


### Features

* Log instance creations when logger is registered ([e247aac](https://github.com/snatalenko/di0/commit/e247aacf6cf7e148a1015203306b16fc24b005ed))

### Changes

* Container builder of an extended type returned by builder() method ([be48e1b](https://github.com/snatalenko/di0/commit/be48e1b3e50fc935eb2b5a61a6090393c43e8ae8))


# [0.4.0](https://github.com/snatalenko/di0/compare/v0.3.3...v0.4.0) (2020-01-09)


### Features

* Detect circular dependencies ([a3b67c6](https://github.com/snatalenko/di0/commit/a3b67c6ee616e5c1e84853d1d883cd000b7a97a2))

### Changes

* Validate type alias for conflict with container methods ([ac75530](https://github.com/snatalenko/di0/commit/ac75530bfca1d5eafe343dbf0608f22ee5c0e81a))

### Documentation

* Describe class extensions and generics in definitions ([d20c4c4](https://github.com/snatalenko/di0/commit/d20c4c44551d52855f70dd4c1d2f8351cc3a6a5a))


## [0.3.3](https://github.com/snatalenko/di0/compare/v0.3.2...v0.3.3) (2020-01-06)


### Changes

* Wrap types in a namespace ([b5809a4](https://github.com/snatalenko/di0/commit/b5809a481dc340c9b0e7cddd6d4bde11dbad06b2))


## [0.3.2](https://github.com/snatalenko/di0/compare/v0.3.1...v0.3.2) (2020-01-05)



## [0.3.1](https://github.com/snatalenko/di0/compare/v0.3.0...v0.3.1) (2020-01-05)



# [0.3.0](https://github.com/snatalenko/di0/compare/v0.2.0...v0.3.0) (2020-01-05)



# [0.2.0](https://github.com/snatalenko/di0/compare/v0.1.0...v0.2.0) (2019-12-27)


### Features

* Inject container methods (get, getAll, etc) ([3b944cb](https://github.com/snatalenko/di0/commit/3b944cb2cf876bc8fa46e26a858c7f2214210c93))

### Build System

* Add automatic changelog generating ([6139983](https://github.com/snatalenko/di0/commit/6139983009e622a2da7512393d5d6aeb0e11d6e1))


