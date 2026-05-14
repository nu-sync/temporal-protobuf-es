import { test } from "node:test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  installPackedPackageFixture,
  makeTempDir,
  removeTempDir,
  run,
} from "./support/fixture-utils.mjs";

test("packed npm fixture supports ESM, CommonJS, and payloadConverterPath loading", () => {
  const tempDir = makeTempDir("npm-packed-fixture");

  try {
    installPackedPackageFixture(tempDir);

    writeFileSync(
      join(tempDir, "payload-converter.cjs"),
      `const { EmptySchema, TimestampSchema } = require("@bufbuild/protobuf/wkt");
const {
  createBinaryProtobufEsPayloadConverter,
} = require("@nu-sync/temporal-protobuf-es");

exports.payloadConverter = createBinaryProtobufEsPayloadConverter([
  TimestampSchema,
  EmptySchema,
]);
`,
    );

    writeFileSync(
      join(tempDir, "verify-esm.mjs"),
      `import assert from "node:assert/strict";

import { create } from "@bufbuild/protobuf";
import { EmptySchema, TimestampSchema } from "@bufbuild/protobuf/wkt";
import {
  METADATA_ENCODING_KEY,
  METADATA_MESSAGE_TYPE_KEY,
} from "@temporalio/common";
import {
  createJsonProtobufEsPayloadConverter,
  createProtobufEsPayloadConverter,
} from "@nu-sync/temporal-protobuf-es";

const textDecoder = new TextDecoder();
const schemas = [TimestampSchema, EmptySchema];

function metadata(payload, key) {
  return textDecoder.decode(payload.metadata?.[key]);
}

const binary = createProtobufEsPayloadConverter({
  schemas,
  encoding: "binary",
});
const json = createJsonProtobufEsPayloadConverter(schemas);
const message = create(TimestampSchema, { seconds: 11n, nanos: 22 });
const binaryPayload = binary.toPayload(message);
const jsonPayload = json.toPayload(message);
const emptyPayload = binary.toPayload(create(EmptySchema));

assert.equal(binary.encode, "binary");
assert.equal(metadata(binaryPayload, METADATA_ENCODING_KEY), "binary/protobuf");
assert.equal(
  metadata(binaryPayload, METADATA_MESSAGE_TYPE_KEY),
  "google.protobuf.Timestamp",
);
assert.deepEqual(binary.fromPayload(binaryPayload), message);
assert.deepEqual(json.fromPayload(binaryPayload), message);

assert.equal(json.encode, "json");
assert.equal(metadata(jsonPayload, METADATA_ENCODING_KEY), "json/protobuf");
assert.deepEqual(binary.fromPayload(jsonPayload), message);

assert.equal(
  metadata(emptyPayload, METADATA_MESSAGE_TYPE_KEY),
  "google.protobuf.Empty",
);
assert.equal(emptyPayload.data.length, 0);
assert.deepEqual(binary.fromPayload(emptyPayload), create(EmptySchema));

console.log("esm fixture ok");
`,
    );

    writeFileSync(
      join(tempDir, "verify-cjs.cjs"),
      `const assert = require("node:assert/strict");
const { create } = require("@bufbuild/protobuf");
const { TimestampSchema } = require("@bufbuild/protobuf/wkt");
const { METADATA_ENCODING_KEY } = require("@temporalio/common");
const {
  createBinaryProtobufEsPayloadConverter,
} = require("@nu-sync/temporal-protobuf-es");

const textDecoder = new TextDecoder();
const message = create(TimestampSchema, { seconds: 33n, nanos: 44 });
const converter = createBinaryProtobufEsPayloadConverter([TimestampSchema]);
const payload = converter.toPayload(message);
const modulePath = require.resolve("./payload-converter.cjs");
const loaded = require(modulePath);

assert.equal(typeof converter.toPayload, "function");
assert.equal(
  textDecoder.decode(payload.metadata?.[METADATA_ENCODING_KEY]),
  "binary/protobuf",
);
assert.deepEqual(converter.fromPayload(payload), message);
assert.equal(typeof loaded.payloadConverter.toPayload, "function");
assert.equal(typeof loaded.payloadConverter.fromPayload, "function");

console.log("cjs fixture ok");
`,
    );

    run("node", ["verify-esm.mjs"], { cwd: tempDir });
    run("node", ["verify-cjs.cjs"], { cwd: tempDir });
  } finally {
    removeTempDir(tempDir);
  }
});
