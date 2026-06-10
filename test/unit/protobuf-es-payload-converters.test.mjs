import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

import { create, createRegistry } from "@bufbuild/protobuf";
import {
  AnySchema,
  EmptySchema,
  TimestampSchema,
  anyPack,
  anyUnpack,
} from "@bufbuild/protobuf/wkt";
import {
  BinaryPayloadConverter,
  JsonPayloadConverter,
  PayloadConverterError,
  UndefinedPayloadConverter,
  ValueError,
  METADATA_ENCODING_KEY,
  METADATA_MESSAGE_TYPE_KEY,
} from "@temporalio/common";
import {
  DefaultPayloadConverterWithProtobufsEs,
  ProtobufEsBinaryPayloadConverter,
  ProtobufEsJsonPayloadConverter,
  createBinaryProtobufEsPayloadConverter,
  createJsonProtobufEsPayloadConverter,
  createProtobufEsPayloadConverter,
  makeBinaryProtobufEsPayloadConverter,
  makeJsonProtobufEsPayloadConverter,
  makeProtobufEsPayloadConverter,
} from "@nu-sync/temporal-protobuf-es";

const require = createRequire(import.meta.url);
const textDecoder = new TextDecoder();

const registry = createRegistry(TimestampSchema, AnySchema);

function timestamp() {
  return create(TimestampSchema, { seconds: 123n, nanos: 456 });
}

function decodeMetadata(payload, key) {
  return textDecoder.decode(payload.metadata?.[key]);
}

test("binary protobuf converter serializes and round-trips protobuf-es messages", () => {
  const converter = new ProtobufEsBinaryPayloadConverter(registry);
  const message = timestamp();
  const payload = converter.toPayload(message);

  assert.equal(
    decodeMetadata(payload, METADATA_ENCODING_KEY),
    "binary/protobuf",
  );
  assert.equal(
    decodeMetadata(payload, METADATA_MESSAGE_TYPE_KEY),
    "google.protobuf.Timestamp",
  );
  assert.deepEqual(converter.fromPayload(payload), message);
});

test("binary converter decodes a Node Buffer slice without reading past its bounds", () => {
  const converter = new ProtobufEsBinaryPayloadConverter(registry);
  const payload = converter.toPayload(timestamp());

  // Simulate Temporal handing back data as a Buffer that is a view into a larger
  // pooled ArrayBuffer (nonzero byteOffset, trailing bytes beyond byteLength).
  const padded = Buffer.alloc(payload.data.length + 8, 0xff);
  Buffer.from(payload.data).copy(padded, 4);
  const bufferSlice = padded.subarray(4, 4 + payload.data.length);

  const decoded = converter.fromPayload({
    ...payload,
    data: bufferSlice,
  });

  assert.deepEqual(decoded, timestamp());
});

test("json protobuf converter serializes and round-trips protobuf-es messages", () => {
  const converter = new ProtobufEsJsonPayloadConverter(registry);
  const message = timestamp();
  const payload = converter.toPayload(message);

  assert.equal(decodeMetadata(payload, METADATA_ENCODING_KEY), "json/protobuf");
  assert.equal(
    decodeMetadata(payload, METADATA_MESSAGE_TYPE_KEY),
    "google.protobuf.Timestamp",
  );
  assert.deepEqual(converter.fromPayload(payload), message);
});

test("json protobuf converter resolves google.protobuf.Any through the registry", () => {
  const packed = anyPack(TimestampSchema, timestamp());
  const converter = new ProtobufEsJsonPayloadConverter(registry);
  const decoded = converter.fromPayload(converter.toPayload(packed));

  assert.deepEqual(anyUnpack(decoded, TimestampSchema), timestamp());
});

test("protobuf converters accept schema arrays in lieu of a registry", () => {
  const converter = new ProtobufEsBinaryPayloadConverter([TimestampSchema]);
  const message = timestamp();
  const payload = converter.toPayload(message);

  assert.deepEqual(converter.fromPayload(payload), message);
});

test("protobuf converters ignore non-protobuf values", () => {
  const converter = new ProtobufEsBinaryPayloadConverter(registry);

  assert.equal(converter.toPayload(null), undefined);
  assert.equal(converter.toPayload({}), undefined);
  assert.equal(converter.toPayload({ $typeName: 1 }), undefined);
  assert.equal(converter.toPayload("abc"), undefined);
  assert.equal(converter.toPayload(new Uint8Array([1, 2, 3])), undefined);
});

test("protobuf converters report missing registry and malformed payload failures", () => {
  const message = timestamp();
  const emptyRegistryConverter = new ProtobufEsBinaryPayloadConverter(
    createRegistry(),
  );
  assert.throws(() => emptyRegistryConverter.toPayload(message), {
    name: PayloadConverterError.name,
    message: /cannot find corresponding message schema/,
  });

  const converterWithoutRegistry = new ProtobufEsBinaryPayloadConverter();
  assert.throws(() => converterWithoutRegistry.toPayload(message), {
    name: PayloadConverterError.name,
    message: /without `registry`/,
  });

  const converter = new ProtobufEsBinaryPayloadConverter(registry);
  assert.throws(
    () =>
      converter.fromPayload({
        metadata: {
          [METADATA_ENCODING_KEY]: new TextEncoder().encode("binary/protobuf"),
        },
      }),
    { name: ValueError.name, message: "Got payload with no data" },
  );

  assert.throws(
    () =>
      converter.fromPayload({
        metadata: {
          [METADATA_ENCODING_KEY]: new TextEncoder().encode("binary/protobuf"),
        },
        data: new Uint8Array(),
      }),
    {
      name: ValueError.name,
      message: "Got protobuf payload without metadata.messageType",
    },
  );

  assert.throws(
    () =>
      converter.fromPayload({
        metadata: {
          [METADATA_MESSAGE_TYPE_KEY]: new TextEncoder().encode(
            "google.protobuf.Timestamp",
          ),
        },
        data: new Uint8Array(),
      }),
    {
      name: ValueError.name,
      message: "Got protobuf payload without metadata.encoding",
    },
  );

  assert.throws(
    () =>
      converter.fromPayload({
        metadata: {
          [METADATA_ENCODING_KEY]: new TextEncoder().encode("json/protobuf"),
          [METADATA_MESSAGE_TYPE_KEY]: new TextEncoder().encode(
            "google.protobuf.Timestamp",
          ),
        },
        data: new Uint8Array(),
      }),
    {
      name: ValueError.name,
      message:
        "Got protobuf payload with metadata.encoding=json/protobuf; expected binary/protobuf",
    },
  );
});

test("protobuf payload metadata byte arrays are fresh per conversion", () => {
  const converter = new ProtobufEsBinaryPayloadConverter(registry);
  const first = converter.toPayload(timestamp());
  const second = converter.toPayload(timestamp());

  assert.notEqual(
    first.metadata[METADATA_ENCODING_KEY],
    second.metadata[METADATA_ENCODING_KEY],
  );

  first.metadata[METADATA_ENCODING_KEY][0] = 0;
  assert.equal(
    decodeMetadata(second, METADATA_ENCODING_KEY),
    "binary/protobuf",
  );
});

test("default helper encodes binary protobuf and still decodes json protobuf", () => {
  const converter = createProtobufEsPayloadConverter({
    schemas: [TimestampSchema, AnySchema],
    encoding: "binary",
  });
  const message = timestamp();
  const binaryPayload = converter.toPayload(message);
  const jsonPayload = new ProtobufEsJsonPayloadConverter(registry).toPayload(
    message,
  );

  assert.equal(
    decodeMetadata(binaryPayload, METADATA_ENCODING_KEY),
    "binary/protobuf",
  );
  assert.deepEqual(converter.fromPayload(jsonPayload), message);
});

test("registry-only helper input defaults to binary encoding", () => {
  const converter = createProtobufEsPayloadConverter([TimestampSchema]);
  const payload = converter.toPayload(timestamp());

  assert.equal(converter.encode, "binary");
  assert.equal(
    decodeMetadata(payload, METADATA_ENCODING_KEY),
    "binary/protobuf",
  );
});

test("google.protobuf.Empty is encoded when EmptySchema is explicitly registered", () => {
  const empty = create(EmptySchema);
  const withoutEmptySchema = createProtobufEsPayloadConverter([
    TimestampSchema,
  ]);

  assert.throws(() => withoutEmptySchema.toPayload(empty), {
    name: PayloadConverterError.name,
    message: /google\.protobuf\.Empty/,
  });

  const converter = createProtobufEsPayloadConverter([
    TimestampSchema,
    EmptySchema,
  ]);
  const payload = converter.toPayload(empty);

  assert.equal(
    decodeMetadata(payload, METADATA_ENCODING_KEY),
    "binary/protobuf",
  );
  assert.equal(
    decodeMetadata(payload, METADATA_MESSAGE_TYPE_KEY),
    "google.protobuf.Empty",
  );
  assert.equal(payload.data.length, 0);
  assert.deepEqual(converter.fromPayload(payload), empty);
});

test("json helper encodes json protobuf and still decodes binary protobuf", () => {
  const converter = createJsonProtobufEsPayloadConverter(registry);
  const message = timestamp();
  const jsonPayload = converter.toPayload(message);
  const binaryPayload = new ProtobufEsBinaryPayloadConverter(
    registry,
  ).toPayload(message);

  assert.equal(converter.encode, "json");
  assert.equal(
    decodeMetadata(jsonPayload, METADATA_ENCODING_KEY),
    "json/protobuf",
  );
  assert.deepEqual(converter.fromPayload(binaryPayload), message);
});

test("binary helper is explicit about binary encoding preference", () => {
  const converter = createBinaryProtobufEsPayloadConverter(registry);
  const payload = converter.toPayload(timestamp());

  assert.equal(converter.encode, "binary");
  assert.equal(
    decodeMetadata(payload, METADATA_ENCODING_KEY),
    "binary/protobuf",
  );
});

test("make helpers remain aliases for create helpers", () => {
  assert.equal(
    makeProtobufEsPayloadConverter,
    createProtobufEsPayloadConverter,
  );
  assert.equal(
    makeBinaryProtobufEsPayloadConverter,
    createBinaryProtobufEsPayloadConverter,
  );
  assert.equal(
    makeJsonProtobufEsPayloadConverter,
    createJsonProtobufEsPayloadConverter,
  );
});

test("composite converter delegates undefined, binary, and plain json values", () => {
  const converter = new DefaultPayloadConverterWithProtobufsEs({ registry });
  const bytes = new Uint8Array([1, 2, 3]);

  assert.deepEqual(
    converter.toPayload(undefined),
    new UndefinedPayloadConverter().toPayload(undefined),
  );
  assert.deepEqual(
    converter.toPayload(bytes),
    new BinaryPayloadConverter().toPayload(bytes),
  );
  assert.deepEqual(
    converter.toPayload({ ok: true }),
    new JsonPayloadConverter().toPayload({ ok: true }),
  );
});

test("package exposes CommonJS entrypoint for payloadConverterPath users", () => {
  const cjsPackage = require("@nu-sync/temporal-protobuf-es");

  assert.equal(typeof cjsPackage.createProtobufEsPayloadConverter, "function");
  assert.equal(
    typeof cjsPackage.createBinaryProtobufEsPayloadConverter,
    "function",
  );
  assert.equal(typeof cjsPackage.makeProtobufEsPayloadConverter, "function");
});

test("CommonJS payloadConverterPath module exposes a named payloadConverter", () => {
  const modulePath = require.resolve("../fixtures/payload-converter.cjs");
  const loaded = require(modulePath);

  assert.equal(typeof loaded.payloadConverter.toPayload, "function");
  assert.equal(typeof loaded.payloadConverter.fromPayload, "function");
  assert.equal(
    decodeMetadata(
      loaded.payloadConverter.toPayload(timestamp()),
      METADATA_ENCODING_KEY,
    ),
    "binary/protobuf",
  );
});

test("invalid registry inputs fail early", () => {
  assert.throws(() => new ProtobufEsBinaryPayloadConverter("nope"), {
    name: TypeError.name,
  });
  assert.throws(
    () => createProtobufEsPayloadConverter({ registry: [], encode: "other" }),
    {
      name: TypeError.name,
      message: "`encode` must be either `binary` or `json`",
    },
  );
  assert.throws(
    () =>
      createProtobufEsPayloadConverter({
        registry: [],
        schemas: [],
        encoding: "binary",
      }),
    {
      name: TypeError.name,
      message: "Specify either `registry` or `schemas`, not both",
    },
  );
  assert.throws(
    () =>
      createProtobufEsPayloadConverter({
        registry: [],
        encode: "binary",
        encoding: "json",
      }),
    {
      name: TypeError.name,
      message: "`encode` and `encoding` must agree when both are provided",
    },
  );
});
