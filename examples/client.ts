import { createRequire } from "node:module";

import { Client, Connection } from "@temporalio/client";

// Temporal loads the app-local converter module synchronously via `require(...)`,
// so resolve it to an absolute path from ESM code.
const require = createRequire(import.meta.url);
const payloadConverterPath = require.resolve("./payload-converter");

const connection = await Connection.connect();

export const client = new Client({
  connection,
  dataConverter: { payloadConverterPath },
});
