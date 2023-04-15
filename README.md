# Tigris TypeScript Client Library

[![npm](https://img.shields.io/npm/v/@tigrisdata/core?logo=npm&logoColor=white)](https://www.npmjs.com/package/@tigrisdata/core)
[![build](https://github.com/tigrisdata/tigris-client-ts/actions/workflows/ts-ci.yml/badge.svg?branch=main)](https://github.com/tigrisdata/tigris-client-ts/actions/workflows/ts-ci.yml)
[![codecov](https://codecov.io/gh/tigrisdata/tigris-client-ts/branch/main/graph/badge.svg)](https://codecov.io/gh/tigrisdata/tigris-client-ts)
[![GitHub](https://img.shields.io/github/license/tigrisdata/tigris-client-ts)](https://github.com/tigrisdata/tigris-client-ts/blob/main/LICENSE)
[![Discord](https://img.shields.io/discord/1033842669983633488?color=%23596fff&label=Discord&logo=discord&logoColor=%23ffffff)](https://tigris.dev/discord)
[![Twitter Follow](https://img.shields.io/twitter/follow/tigrisdata?style=social)](https://twitter.com/tigrisdata)

# Documentation

- [Tigris Overview](https://www.tigrisdata.com/docs/concepts/)
- [Getting Started](https://www.tigrisdata.com/docs/quickstarts/)
- [Database](https://www.tigrisdata.com/docs/sdkstools/typescript/database/)
- [Search](https://www.tigrisdata.com/docs/sdkstools/typescript/database/search/)

# Building

```
# clean the dev env
npm run clean

# build
npm run build

# test
npm run test

# lint
npm run lint
```

# Installation note for Apple M1

Since ARM binaries are not provided for `grpc-tools` package by the grpc
team. Hence, the x86_64 version of `grpc-tools` must be installed.

```shell
npm_config_target_arch=x64 npm i grpc-tools
npm i
```

# Code Quality

## 1. Linting

The coding style rules are defined by [Prettier](https://prettier.io/) and
enforced by [Eslint](https://eslint.org)

## 2. Git Hooks

We use [pre-commit](https://pre-commit.com/index.html) to automatically
setup and run git hooks.

Install the pre-commit hooks as follows:

```shell
pre-commit install
```

On every `git commit` we check the code quality using prettier and eslint.

# License

This software is licensed under the [Apache 2.0](LICENSE).
