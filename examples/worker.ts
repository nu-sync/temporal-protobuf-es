import { createRequire } from "node:module";

import { Worker } from "@temporalio/worker";

// The worker uses the same app-local converter module as the client so payloads
// encode and decode identically on both sides.
const require = createRequire(import.meta.url);
const payloadConverterPath = require.resolve("./payload-converter");

const worker = await Worker.create({
  taskQueue: "my-task-queue",
  workflowsPath: require.resolve("./workflows"),
  dataConverter: { payloadConverterPath },
});

await worker.run();
