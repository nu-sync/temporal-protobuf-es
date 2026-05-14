---
name: temporal-protobuf-es-testing
description: Use when designing, adding, running, or debugging temporal-protobuf-es tests, including unit tests, npm fixtures, Deno compatibility, Temporal integration, and Rust payload compatibility.
---

# temporal-protobuf-es Testing

Use this skill for test planning and validation work in this repo.

## Read First

1. `SPEC.md`, especially `Test Plan`, `Compatibility Goals`, and `Release Criteria`
2. `justfile`
3. Existing tests and fixtures once package code exists
4. Local sibling SDK tests if present:
   - `../sdk-typescript/packages/test/src/test-payload-converter-es.ts`

## Test Priorities

- Start with focused unit tests for converter behavior and error messages.
- Prove metadata compatibility before broader integration tests.
- Add npm-installed fixture coverage before release-oriented documentation examples.
- Keep Deno compatibility focused on converter construction and payload round trips unless full Temporal worker execution is practical.
- Treat Rust binary payload compatibility as the cross-language baseline.

## Required Coverage Areas

- binary and proto3 JSON round trips
- `DefaultPayloadConverterWithProtobufsEs` converter ordering
- registry and schema-array inputs
- missing registry and missing message type failures
- `google.protobuf.Any` with registered embedded schemas
- plain objects containing `$typeName`
- fresh payload metadata bytes per conversion
- app-local `payload-converter.ts` usage through `payloadConverterPath`

## Validation

- Add every stable test command to `justfile`.
- Run the narrowest failing or newly added test first, then broaden to `just check`.
- Record known fixture limitations in `SPEC.md` rather than hiding them in test code.
