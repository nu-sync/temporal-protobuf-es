# temporal-protobuf-es

Community-maintained Temporal TypeScript payload converters for protobuf-es messages.

## Usage

```ts
import { createProtobufEsPayloadConverter } from "@nu-sync/temporal-protobuf-es";
import {
  StartOrderRequestSchema,
  StartOrderResultSchema,
} from "./gen/messages_pb";

export const payloadConverter = createProtobufEsPayloadConverter({
  schemas: [StartOrderRequestSchema, StartOrderResultSchema],
  encoding: "binary",
});
```

The helper defaults to binary protobuf encoding for cross-language Temporal payload compatibility. Use `encoding: "json"` or `createJsonProtobufEsPayloadConverter(...)` for TypeScript-only applications that prefer proto3 JSON payloads. The package also keeps `make*` helper aliases for callers that prefer that naming style.

Schema registration is explicit, including well-known types. If a workflow input or output uses `google.protobuf.Empty`, import `EmptySchema` from `@bufbuild/protobuf/wkt` and include it in the `schemas` array or generated schema inventory.

`payloadConverterPath` modules must export a named `payloadConverter`, as shown above. The package ships both ESM and CommonJS entrypoints so Temporal's synchronous `require(...)` loader can load app-local converter modules.

## Validation

```sh
just test-unit
just test-e2e
just test-e2e-npm
just test-e2e-sdk-loader
just test-e2e-deno
just test-e2e-rust
just test-e2e-temporal-worker
just verify
just verify-integration
```

The e2e suite installs the packed npm tarball into temporary fixture apps, checks Node ESM/CommonJS loading, verifies Temporal SDK `loadDataConverter` behavior for `payloadConverterPath`, runs a Deno npm-import round trip, and verifies Rust binary wire-format compatibility without external services.

`just test-e2e-temporal-worker` is an explicit live integration gate. It requires an installed Temporal CLI or `TEMPORAL_TEST_SERVER_EXECUTABLE`, starts a local Temporal dev server, then runs a real `@temporalio/client` and `@temporalio/worker` with `dataConverter.payloadConverterPath`. It is intentionally outside `just release-check` because the publish workflow does not provision the Temporal CLI. Use `just verify-integration` when the Temporal CLI is available and you want the full local release check plus the live worker/client fixture.

## Release

The official npm publish path is GitHub Actions. Create and publish a GitHub release whose tag matches `package.json`, such as `v0.0.1`; `.github/workflows/publish.yml` installs Node and Deno, runs `npm run release-check`, uploads the validated tarball, and publishes `@nu-sync/temporal-protobuf-es` to npm from that tarball.

For the first publish, use a temporary npm automation token stored as the repository secret `NPM_TOKEN`; the workflow publishes with `npm publish --access public --provenance`. After the package exists on npm, configure npm trusted publishing for GitHub Actions with:

- Package: `@nu-sync/temporal-protobuf-es`
- Organization or user: `nu-sync`
- Repository: `temporal-protobuf-es`
- Workflow filename: `publish.yml`

Then remove `NPM_TOKEN`. Future releases publish through OIDC trusted publishing without a long-lived npm token, and npm generates provenance automatically.

If the GitHub release workflow fails before publishing to npm, fix the workflow, ensure the release tag points at the corrected commit, and manually dispatch `publish.yml` with the same tag.
