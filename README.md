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
