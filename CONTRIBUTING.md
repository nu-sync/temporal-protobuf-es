# Contributing

Thanks for helping improve `@nu-sync/temporal-protobuf-es`.

## Prerequisites

- Node.js 20+
- [Deno](https://deno.com/) (for the Deno npm-import round-trip e2e test)
- A Rust toolchain (for the Rust binary wire-format compatibility e2e test)
- [`just`](https://github.com/casey/just) for the task recipes
- Optional: the [Temporal CLI](https://docs.temporal.io/cli) (or `TEMPORAL_TEST_SERVER_EXECUTABLE`) for the live worker/client integration test

Install dependencies with `npm ci`.

## Verification

```sh
just verify
```

`just verify` is the standard gate: it builds the package, checks that tracked generated fixtures are not stale, typechecks, and runs the unit + e2e suites. The e2e suite installs the packed npm tarball into temporary fixture apps and checks:

- Node ESM and CommonJS loading
- Temporal SDK `loadDataConverter` behavior for `payloadConverterPath`
- a generated protobuf-es schema inventory
- a Deno npm-import round trip
- Rust binary wire-format compatibility

All of the above run without external services.

The generated schema fixture comes from `test/e2e/generated-schema/orders.proto` via Buf and `@bufbuild/protoc-gen-es`. Run `just generate-fixtures` after changing fixture protos; `just check` regenerates the fixture and fails if the tracked generated files are stale.

### Live integration test

```sh
just verify-integration
```

`just test-e2e-temporal-worker` is an explicit live integration gate, kept separate from `just verify`. It requires an installed Temporal CLI or `TEMPORAL_TEST_SERVER_EXECUTABLE`, starts a local Temporal dev server, then runs a real `@temporalio/client` and `@temporalio/worker` with `dataConverter.payloadConverterPath`. It is intentionally outside `just release-check` because the publish workflow does not provision the Temporal CLI. `just verify-integration` runs the full local release check plus this live fixture.

### Recipe index

| Recipe                          | Purpose                                                     |
| ------------------------------- | ----------------------------------------------------------- |
| `just verify`                   | Standard local gate (build, check, lint, unit + e2e tests). |
| `just verify-integration`       | `release-check` plus the live Temporal worker/client test.  |
| `just test-unit`                | Unit tests only.                                            |
| `just test-e2e`                 | Full e2e suite (no external services).                      |
| `just test-e2e-temporal-worker` | Live Temporal worker/client test (needs Temporal CLI).      |
| `just generate-fixtures`        | Regenerate tracked Buf/protobuf-es e2e fixtures.            |
| `just release-check`            | Full local release lifecycle (verify, format, pack).        |

## Release

The official npm publish path is GitHub Actions. GitHub release notes should mirror the [CHANGELOG.md](./CHANGELOG.md) entry for the same version.

Create and publish a GitHub release whose tag matches `package.json`, such as `v0.0.1`. `.github/workflows/publish.yml` installs Node and Deno, runs `npm run release-check`, uploads the validated tarball, and publishes `@nu-sync/temporal-protobuf-es` to npm from that tarball.

For a first-time package bootstrap, use a temporary npm automation token stored as the repository secret `NPM_TOKEN`; the workflow publishes with `npm publish --access public --provenance`. After the package exists on npm, configure npm trusted publishing for GitHub Actions with:

- Package: `@nu-sync/temporal-protobuf-es`
- Organization or user: `nu-sync`
- Repository: `temporal-protobuf-es`
- Workflow filename: `publish.yml`

Then remove `NPM_TOKEN`. Future releases publish through OIDC trusted publishing without a long-lived npm token, and npm generates provenance automatically.

If the GitHub release workflow fails before publishing to npm, fix the workflow, ensure the release tag points at the corrected commit, and manually dispatch `publish.yml` with the same tag.
