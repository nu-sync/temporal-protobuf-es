import { test } from "node:test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  installPackedPackageFixture,
  makeTempDir,
  removeTempDir,
  run,
} from "./support/fixture-utils.mjs";

test("Deno fixture imports the packed package through node_modules and round-trips protobuf payloads", () => {
  const tempDir = makeTempDir("deno-packed-fixture");

  try {
    installPackedPackageFixture(tempDir);

    writeFileSync(
      join(tempDir, "roundtrip.ts"),
      `import { create } from "@bufbuild/protobuf";
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
const binary = createProtobufEsPayloadConverter({
  schemas,
  encoding: "binary",
});
const json = createJsonProtobufEsPayloadConverter(schemas);
const timestamp = create(TimestampSchema, { seconds: 55n, nanos: 66 });
const binaryPayload = binary.toPayload(timestamp);
const jsonPayload = json.toPayload(timestamp);
const emptyPayload = binary.toPayload(create(EmptySchema));

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function metadata(payload: { metadata?: Record<string, Uint8Array> }, key: string) {
  return textDecoder.decode(payload.metadata?.[key]);
}

assert(metadata(binaryPayload, METADATA_ENCODING_KEY) === "binary/protobuf", "binary encoding metadata");
assert(metadata(jsonPayload, METADATA_ENCODING_KEY) === "json/protobuf", "json encoding metadata");
assert(
  metadata(emptyPayload, METADATA_MESSAGE_TYPE_KEY) === "google.protobuf.Empty",
  "Empty message type metadata",
);
assert(binary.fromPayload(binaryPayload).seconds === 55n, "binary round trip seconds");
assert(json.fromPayload(binaryPayload).nanos === 66, "json converter decodes binary payload");
assert(binary.fromPayload(jsonPayload).seconds === 55n, "binary converter decodes json payload");
assert(emptyPayload.data.length === 0, "Empty wire data is empty");

console.log("deno fixture ok");
`,
    );

    run(
      "deno",
      ["run", "--node-modules-dir=manual", "--allow-read", "roundtrip.ts"],
      { cwd: tempDir },
    );
  } finally {
    removeTempDir(tempDir);
  }
});
