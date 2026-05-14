---
name: temporal-protobuf-es-compatibility-release
description: Use when validating temporal-protobuf-es compatibility, packaging, release readiness, npm fixtures, Deno fixtures, Rust wire-format interop, or payloadConverterPath behavior.
---

# temporal-protobuf-es Compatibility And Release

Use this skill for compatibility and release-readiness work in this repo.

## Read First

1. `SPEC.md`, especially `Compatibility Goals`, `Test Plan`, and `Release Criteria`
2. `justfile`
3. Local sibling wire-format and SDK references when present:
   - `../protoc-gen-rust-temporal/WIRE-FORMAT.md`
   - `../sdk-typescript/packages/common/src/internal-non-workflow/data-converter-helpers.ts`
   - `../sdk-typescript/packages/worker/src/workflow/bundler.ts`
   - `../sdk-typescript/packages/test/src/test-payload-converter-es.ts`

## Compatibility Rules

- Treat Rust and Go interoperability as a binary protobuf wire-format contract first.
- Treat Temporal TypeScript default converter ergonomics as a separate JSON-first composite behavior.
- Verify app-local converter modules export a named `payloadConverter`.
- Verify package examples are copied from fixtures that actually run.
- Keep publishing as a manual release action; do not publish from Codex unless explicitly directed.

## Release Validation Areas

- `npm pack` installs in a clean fixture.
- ESM imports work from the packed package.
- `payloadConverterPath` works from a client and worker fixture.
- Deno npm imports can construct the converter and round-trip payloads.
- Rust compatibility covers at least binary protobuf payloads with `encoding` and `messageType` metadata.
- README examples reflect tested code.

## Validation

- Add stable compatibility commands to `justfile` before relying on them in docs.
- Prefer fixture-specific commands first, then run the broad release check.
- Document any compatibility limitation in `SPEC.md` before release.
