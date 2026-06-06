# Example: client + worker with a protobuf-es payload converter

A minimal end-to-end shape for wiring `@nu-sync/temporal-protobuf-es` into a
Temporal TypeScript app. These files are illustrative snippets, not a runnable
project — drop them into your own app and replace the schema imports and
workflow names with your own.

- [`payload-converter.ts`](./payload-converter.ts) — the app-local module that
  exports the named `payloadConverter`. Register every protobuf-es message
  schema your workflows and activities exchange.
- [`client.ts`](./client.ts) — passes `dataConverter.payloadConverterPath` to
  `new Client(...)`, resolving the converter module with
  `createRequire(import.meta.url)`.
- [`worker.ts`](./worker.ts) — passes the same `dataConverter` to
  `Worker.create(...)`.

Workflow and activity bodies stay handwritten against the Temporal SDK; this
package only converts payloads. For a converter exercised against a live
Temporal dev server, see `test/e2e/temporal-worker/` in the repo root.
