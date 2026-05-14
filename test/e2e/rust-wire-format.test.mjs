import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { create } from "@bufbuild/protobuf";
import { EmptySchema, TimestampSchema } from "@bufbuild/protobuf/wkt";
import {
  METADATA_ENCODING_KEY,
  METADATA_MESSAGE_TYPE_KEY,
} from "@temporalio/common";
import { createBinaryProtobufEsPayloadConverter } from "@nu-sync/temporal-protobuf-es";

import {
  bytesToHex,
  encodeMetadata,
  formatRecord,
  hexToBytes,
  makeTempDir,
  metadataString,
  parseRecord,
  removeTempDir,
  repoRoot,
  run,
} from "./support/fixture-utils.mjs";

test("Rust wire-format fixture decodes TypeScript payloads and emits payloads TypeScript can decode", () => {
  const tempDir = makeTempDir("rust-wire-format");

  try {
    const binaryPath = join(tempDir, "interop");
    const inputPath = join(tempDir, "input.record");
    const outputPath = join(tempDir, "output.record");
    const converter = createBinaryProtobufEsPayloadConverter([
      TimestampSchema,
      EmptySchema,
    ]);
    const timestampPayload = converter.toPayload(
      create(TimestampSchema, { seconds: 123n, nanos: 456 }),
    );
    const emptyPayload = converter.toPayload(create(EmptySchema));

    writeFileSync(
      inputPath,
      formatRecord({
        "timestamp.encoding": metadataString(
          timestampPayload,
          METADATA_ENCODING_KEY,
        ),
        "timestamp.messageType": metadataString(
          timestampPayload,
          METADATA_MESSAGE_TYPE_KEY,
        ),
        "timestamp.dataHex": bytesToHex(timestampPayload.data),
        "empty.encoding": metadataString(emptyPayload, METADATA_ENCODING_KEY),
        "empty.messageType": metadataString(
          emptyPayload,
          METADATA_MESSAGE_TYPE_KEY,
        ),
        "empty.dataHex": bytesToHex(emptyPayload.data),
      }),
    );

    run(
      "rustc",
      [
        "--edition=2021",
        join(repoRoot, "test/e2e/rust-wire-format/interop.rs"),
        "-o",
        binaryPath,
      ],
      { cwd: repoRoot },
    );
    run(binaryPath, [inputPath, outputPath], { cwd: tempDir });

    const output = parseRecord(readFileSync(outputPath, "utf8"));
    const rustTimestampPayload = payloadFromRecord(output, "timestamp");
    const rustEmptyPayload = payloadFromRecord(output, "empty");

    assert.deepEqual(
      converter.fromPayload(rustTimestampPayload),
      create(TimestampSchema, { seconds: 987n, nanos: 654 }),
    );
    assert.deepEqual(
      converter.fromPayload(rustEmptyPayload),
      create(EmptySchema),
    );
  } finally {
    removeTempDir(tempDir);
  }
});

function payloadFromRecord(record, prefix) {
  return {
    metadata: {
      [METADATA_ENCODING_KEY]: encodeMetadata(record[`${prefix}.encoding`]),
      [METADATA_MESSAGE_TYPE_KEY]: encodeMetadata(
        record[`${prefix}.messageType`],
      ),
    },
    data: hexToBytes(record[`${prefix}.dataHex`]),
  };
}
