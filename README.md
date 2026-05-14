# temporal-protobuf-es

Community-maintained Temporal TypeScript payload converters for protobuf-es messages.

## Usage

```ts
import { makeProtobufEsPayloadConverter } from "@nu-sync/temporal-protobuf-es";
import {
  StartOrderRequestSchema,
  StartOrderResultSchema,
} from "./gen/messages_pb";

export const payloadConverter = makeProtobufEsPayloadConverter({
  registry: [StartOrderRequestSchema, StartOrderResultSchema],
  encode: "binary",
});
```

The helper defaults to binary protobuf encoding for cross-language Temporal payload compatibility. Use `encode: "json"` or `makeJsonProtobufEsPayloadConverter(...)` for TypeScript-only applications that prefer proto3 JSON payloads.

`payloadConverterPath` modules must export a named `payloadConverter`, as shown above. The package ships both ESM and CommonJS entrypoints so Temporal's synchronous `require(...)` loader can load app-local converter modules.
