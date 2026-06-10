# temporal-protobuf-es

[![npm](https://img.shields.io/npm/v/%40nu-sync%2Ftemporal-protobuf-es.svg)](https://www.npmjs.com/package/@nu-sync/temporal-protobuf-es)

**Status:** v0.0.1 (initial release).

Temporal TypeScript payload converters for [`@bufbuild/protobuf`](https://github.com/bufbuild/protobuf-es) (protobuf-es) messages. The converters carry contract-only Temporal metadata on every payload — the `binary/protobuf` encoding marker, the fully qualified protobuf message type, and the raw proto wire bytes — so a workflow argument written by a TypeScript worker decodes byte-for-byte in a Rust or Go worker. Your clients, workers, and workflow/activity bodies stay handwritten against the Temporal SDK; this package only converts payloads.

## Quick start

Install the package and your protobuf-es runtime:

```sh
npm install @nu-sync/temporal-protobuf-es @bufbuild/protobuf @temporalio/common
```

Create an app-local payload converter module that exports a named `payloadConverter`, registering each generated message schema you exchange:

```ts
// payload-converter.ts
import { createProtobufEsPayloadConverter } from "@nu-sync/temporal-protobuf-es";
import { MyMessageSchema } from "./gen/my_service_pb";

export const payloadConverter = createProtobufEsPayloadConverter({
  schemas: [MyMessageSchema],
  encoding: "binary",
});
```

Point Temporal at that module by path. From ESM client or worker code, resolve it with `createRequire(import.meta.url)`:

```ts
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export const dataConverter = {
  payloadConverterPath: require.resolve("./payload-converter"),
};
```

`payloadConverterPath` modules must export a named `payloadConverter`. The package ships both ESM and CommonJS entrypoints so Temporal's synchronous `require(...)` loader can load app-local converter modules.

See [`examples/`](./examples) for a complete `payload-converter.ts` + `client.ts` + `worker.ts` walkthrough.

## Choosing an encoding

Both modes always **decode** both wire formats. The `encoding` option only controls what gets **written**.

| `encoding`         | Writes            | Use when                                                            |
| ------------------ | ----------------- | ------------------------------------------------------------------- |
| `binary` (default) | `binary/protobuf` | Cross-language interop (Rust/Go workers), wire-compatible payloads. |
| `json`             | `json/protobuf`   | TypeScript-only apps that prefer readable proto3 JSON payloads.     |

`createJsonProtobufEsPayloadConverter(...)` is shorthand for `encoding: "json"`. The package also keeps `make*` aliases for callers who prefer that naming style.

## Well-known types

Schema registration is **explicit for every type, including well-known types** (Empty, Timestamp, Duration, Any, ...). This is intentional: the registry mirrors exactly what your cross-language contract uses, which keeps the binary wire format aligned with the Rust sibling.

If a payload references a message you did not register, the converter throws:

```
Got a `google.protobuf.Empty` protobuf message but cannot find corresponding message schema in `registry`
```

The fix is to add the matching `*Schema` to the `schemas` array. Import well-known type schemas from `@bufbuild/protobuf/wkt`:

```ts
import { EmptySchema } from "@bufbuild/protobuf/wkt";

export const payloadConverter = createProtobufEsPayloadConverter({
  schemas: [MyMessageSchema, EmptySchema],
  encoding: "binary",
});
```

## Where the schemas come from

You can register schemas by hand (as above), or generate a schema inventory.

If you use [`protoc-gen-ts-temporal`](https://github.com/nu-sync/protoc-gen-ts-temporal), it emits a `_pb_register.ts` file per proto whose `schemas` export is a ready-made `readonly DescMessage[]` inventory. Spread one or more inventories into the array:

```ts
import { createProtobufEsPayloadConverter } from "@nu-sync/temporal-protobuf-es";
import { EmptySchema } from "@bufbuild/protobuf/wkt";
import { schemas as customerSchemas } from "./gen/customers_pb_register";
import { schemas as orderSchemas } from "./gen/orders_pb_register";

export const payloadConverter = createProtobufEsPayloadConverter({
  schemas: [...orderSchemas, ...customerSchemas, EmptySchema],
  encoding: "binary",
});
```

## Related

- [protoc-gen-ts-temporal](https://github.com/nu-sync/protoc-gen-ts-temporal) — TypeScript contract generator; produces the `_pb_register.ts` schema inventory this package consumes.
- [protoc-gen-rust-temporal](https://github.com/nu-sync/protoc-gen-rust-temporal) — Rust contract generator for the same annotated protos (binary wire-format sibling).
- [protoc-gen-temporal-interop](https://github.com/nu-sync/protoc-gen-temporal-interop) — cross-language interop harness that proves the TypeScript and Rust contracts exchange payloads.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for prerequisites, the local verification gate, the live integration test, and the release process. Changes are tracked in [CHANGELOG.md](./CHANGELOG.md).
