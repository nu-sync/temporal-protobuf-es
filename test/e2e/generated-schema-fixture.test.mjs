import { test } from "node:test";
import { cpSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  installPackedPackageFixture,
  makeTempDir,
  removeTempDir,
  repoRoot,
  run,
} from "./support/fixture-utils.mjs";

test("packed package accepts generated protobuf-es schema inventories", () => {
  const tempDir = makeTempDir("generated-schema-fixture");

  try {
    installPackedPackageFixture(tempDir);
    cpSync(join(repoRoot, "test/e2e/generated-schema"), join(tempDir, "gen"), {
      recursive: true,
    });

    writeFileSync(
      join(tempDir, "payload-converter.mjs"),
      `import { createProtobufEsPayloadConverter } from "@nu-sync/temporal-protobuf-es";
import { schemas } from "./gen/orders_pb_register.mjs";

export const payloadConverter = createProtobufEsPayloadConverter({
  schemas,
  encoding: "binary",
});
`,
    );

    writeFileSync(
      join(tempDir, "verify-generated-schema.mjs"),
      `import assert from "node:assert/strict";

import { create } from "@bufbuild/protobuf";
import {
  METADATA_ENCODING_KEY,
  METADATA_MESSAGE_TYPE_KEY,
} from "@temporalio/common";
import { createJsonProtobufEsPayloadConverter } from "@nu-sync/temporal-protobuf-es";

import { schemas } from "./gen/orders_pb_register.mjs";
import {
  StartOrderRequestSchema,
  StartOrderResultSchema,
} from "./gen/orders_pb.mjs";
import { payloadConverter } from "./payload-converter.mjs";

const textDecoder = new TextDecoder();
const request = create(StartOrderRequestSchema, {
  orderId: "order-123",
  quantity: 3,
  tags: ["priority", "fragile"],
});
const result = create(StartOrderResultSchema, {
  orderId: "order-123",
  accepted: true,
});

function metadata(payload, key) {
  return textDecoder.decode(payload.metadata?.[key]);
}

assert.deepEqual(
  schemas.map((schema) => schema.typeName),
  [
    "temporal.protobufes.fixture.StartOrderRequest",
    "temporal.protobufes.fixture.StartOrderResult",
  ],
);

const requestPayload = payloadConverter.toPayload(request);
assert.equal(metadata(requestPayload, METADATA_ENCODING_KEY), "binary/protobuf");
assert.equal(
  metadata(requestPayload, METADATA_MESSAGE_TYPE_KEY),
  "temporal.protobufes.fixture.StartOrderRequest",
);
assert.deepEqual(payloadConverter.fromPayload(requestPayload), request);

const resultPayload = payloadConverter.toPayload(result);
assert.equal(
  metadata(resultPayload, METADATA_MESSAGE_TYPE_KEY),
  "temporal.protobufes.fixture.StartOrderResult",
);
assert.deepEqual(payloadConverter.fromPayload(resultPayload), result);

const jsonConverter = createJsonProtobufEsPayloadConverter(schemas);
const jsonPayload = jsonConverter.toPayload(request);
assert.equal(metadata(jsonPayload, METADATA_ENCODING_KEY), "json/protobuf");
assert.deepEqual(payloadConverter.fromPayload(jsonPayload), request);

console.log("generated schema fixture ok");
`,
    );

    run("node", ["verify-generated-schema.mjs"], { cwd: tempDir });
  } finally {
    removeTempDir(tempDir);
  }
});
