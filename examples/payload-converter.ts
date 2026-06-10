import { createProtobufEsPayloadConverter } from "@nu-sync/temporal-protobuf-es";
import { EmptySchema } from "@bufbuild/protobuf/wkt";

// Register every protobuf-es message schema your workflows and activities
// exchange. Generated schemas come from `@bufbuild/protoc-gen-es` (e.g.
// `MyMessageSchema` from `./gen/my_service_pb`); add `EmptySchema` only if a
// signal, query, or update uses `google.protobuf.Empty`.
export const payloadConverter = createProtobufEsPayloadConverter({
  schemas: [
    // ...MyMessageSchema,
    EmptySchema,
  ],
  encoding: "binary",
});
