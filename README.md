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

`payloadConverterPath` modules must export a named `payloadConverter`, as shown above. The package ships both ESM and CommonJS entrypoints so Temporal's synchronous `require(...)` loader can load app-local converter modules.

## Validation

```sh
just test-unit
just test-e2e
just test-e2e-npm
just test-e2e-sdk-loader
just test-e2e-deno
just test-e2e-rust
just verify
```

The e2e suite installs the packed npm tarball into temporary fixture apps, checks Node ESM/CommonJS loading, verifies Temporal SDK `loadDataConverter` behavior for `payloadConverterPath`, runs a Deno npm-import round trip, and verifies Rust binary wire-format compatibility without external services.
