import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { test } from "node:test";

import { create } from "@bufbuild/protobuf";
import { BytesValueSchema, TimestampSchema } from "@bufbuild/protobuf/wkt";
import { Client } from "@temporalio/client";
import { TestWorkflowEnvironment } from "@temporalio/testing";
import { Worker } from "@temporalio/worker";

const require = createRequire(import.meta.url);
const temporalExecutable = findTemporalExecutable();

test(
  "Temporal Worker and Client prototype round-trip protobuf-es payloads through payloadConverterPath",
  { timeout: 120_000 },
  async (t) => {
    if (temporalExecutable === undefined) {
      t.skip(
        "Temporal CLI not found; set TEMPORAL_TEST_SERVER_EXECUTABLE to run this prototype",
      );
      return;
    }

    const dataConverter = {
      payloadConverterPath:
        require.resolve("./temporal-worker/payload-converter.cjs"),
    };
    const env = await TestWorkflowEnvironment.createLocal({
      server: {
        executable: { type: "existing-path", path: temporalExecutable },
        ui: false,
        log: { format: "pretty", level: "error" },
      },
    });

    try {
      const taskQueue = `temporal-protobuf-es-${randomUUID()}`;
      const worker = await Worker.create({
        connection: env.nativeConnection,
        taskQueue,
        workflowsPath: require.resolve("./temporal-worker/workflows.mjs"),
        activities: {
          async bumpTimestamp(input) {
            return create(TimestampSchema, {
              seconds: input.seconds + 1n,
              nanos: input.nanos + 1,
            });
          },
        },
        dataConverter,
      });
      const client = new Client({
        connection: env.connection,
        namespace: env.namespace ?? "default",
        dataConverter,
      });

      await worker.runUntil(async () => {
        const timestampInput = create(TimestampSchema, {
          seconds: 41n,
          nanos: 999,
        });
        const timestampResult = await client.workflow.execute(
          "timestampThroughActivity",
          {
            args: [timestampInput],
            workflowId: `timestamp-${randomUUID()}`,
            taskQueue,
          },
        );
        assert.deepEqual(
          timestampResult,
          create(TimestampSchema, { seconds: 42n, nanos: 1000 }),
        );

        const bytesInput = create(BytesValueSchema, {
          value: new Uint8Array([1, 2, 3, 4]),
        });
        const bytesResult = await client.workflow.execute("echoBytes", {
          args: [bytesInput],
          workflowId: `bytes-${randomUUID()}`,
          taskQueue,
        });
        assert.ok(bytesResult.value instanceof Uint8Array);
        assert.deepEqual(bytesResult.value, bytesInput.value);
      });
    } finally {
      await env.teardown();
    }
  },
);

function findTemporalExecutable() {
  if (process.env.TEMPORAL_TEST_SERVER_EXECUTABLE) {
    return process.env.TEMPORAL_TEST_SERVER_EXECUTABLE;
  }

  const result = spawnSync("which", ["temporal"], { encoding: "utf8" });
  if (result.status === 0) {
    return result.stdout.trim();
  }

  return undefined;
}
