import { test } from "node:test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  installPackedPackageFixture,
  makeTempDir,
  removeTempDir,
  run,
} from "./support/fixture-utils.mjs";

test("Temporal SDK loadDataConverter loads the packed package through payloadConverterPath", () => {
  const tempDir = makeTempDir("sdk-loader-fixture");

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
      join(tempDir, "payload-converter-no-export.cjs"),
      `exports.notPayloadConverter = {};
`,
    );

    writeFileSync(
      join(tempDir, "payload-converter-bad-export.cjs"),
      `exports.payloadConverter = {};
`,
    );

    writeFileSync(
      join(tempDir, "verify-sdk-loader.cjs"),
      `const assert = require("node:assert/strict");
const { create } = require("@bufbuild/protobuf");
const { EmptySchema, TimestampSchema } = require("@bufbuild/protobuf/wkt");
const {
  METADATA_ENCODING_KEY,
  METADATA_MESSAGE_TYPE_KEY,
} = require("@temporalio/common");
const {
  loadDataConverter,
} = require("@temporalio/common/lib/internal-non-workflow");

const textDecoder = new TextDecoder();
const payloadConverterPath = require.resolve("./payload-converter.cjs");
const loaded = loadDataConverter({ payloadConverterPath });
const message = create(TimestampSchema, { seconds: 77n, nanos: 88 });
const payload = loaded.payloadConverter.toPayload(message);
const emptyPayload = loaded.payloadConverter.toPayload(create(EmptySchema));

function metadata(payload, key) {
  return textDecoder.decode(payload.metadata?.[key]);
}

assert.equal(Array.isArray(loaded.payloadCodecs), true);
assert.equal(loaded.payloadCodecs.length, 0);
assert.equal(typeof loaded.failureConverter.errorToFailure, "function");
assert.equal(typeof loaded.failureConverter.failureToError, "function");

assert.equal(metadata(payload, METADATA_ENCODING_KEY), "binary/protobuf");
assert.equal(
  metadata(payload, METADATA_MESSAGE_TYPE_KEY),
  "google.protobuf.Timestamp",
);
assert.deepEqual(loaded.payloadConverter.fromPayload(payload), message);

assert.equal(
  metadata(emptyPayload, METADATA_MESSAGE_TYPE_KEY),
  "google.protobuf.Empty",
);
assert.equal(emptyPayload.data.length, 0);
assert.deepEqual(
  loaded.payloadConverter.fromPayload(emptyPayload),
  create(EmptySchema),
);

assert.throws(
  () =>
    loadDataConverter({
      payloadConverterPath: require.resolve("./payload-converter-no-export.cjs"),
    }),
  /does not have a \`payloadConverter\` named export/,
);
assert.throws(
  () =>
    loadDataConverter({
      payloadConverterPath: require.resolve("./payload-converter-bad-export.cjs"),
    }),
  /must be an object with toPayload and fromPayload methods/,
);

console.log("sdk loader fixture ok");
`,
    );

    run("node", ["verify-sdk-loader.cjs"], { cwd: tempDir });
  } finally {
    removeTempDir(tempDir);
  }
});
