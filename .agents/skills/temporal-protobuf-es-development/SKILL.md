---
name: temporal-protobuf-es-development
description: Use when implementing or reviewing temporal-protobuf-es package code, especially converter APIs, package exports, Temporal payload metadata, and protobuf-es registry handling.
---

# temporal-protobuf-es Development

Use this skill for implementation work in this repo.

## Read First

1. `SPEC.md`
2. `AGENTS.md`
3. `justfile`
4. Local sibling SDK references if present:
   - `../sdk-typescript/packages/common/src/converter/protobuf-es-payload-converters.ts`
   - `../sdk-typescript/packages/common/src/protobufs-es.ts`
   - `../sdk-typescript/packages/common/src/converter/types.ts`
   - `../sdk-typescript/packages/test/src/test-payload-converter-es.ts`

## Development Rules

- Keep implementation aligned with `SPEC.md`; update the spec first when behavior changes.
- Preserve Temporal metadata keys: `encoding` and `messageType`.
- Preserve encoding labels: `binary/protobuf` and `json/protobuf`.
- Keep registry input explicit: accept a `Registry` or an array of generated `DescMessage` schemas.
- Keep runtime dependencies narrow and document every peer dependency.
- Do not import `@temporalio/common/lib/protobufs-es`; this package owns its converter implementation.
- Keep app-local `payloadConverterPath` examples shaped around a named `payloadConverter` export.
- Avoid package publishing, registry changes, or credential use unless the user explicitly asks.

## Validation

- Run `just check` before a milestone commit.
- When package code exists, add focused recipes to `justfile` for typecheck, unit tests, fixture tests, packing, and release checks.
- Commit development milestones separately from docs-only or skill-only milestones.
