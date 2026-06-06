# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.1]

Initial release.

- Temporal payload converters for `@bufbuild/protobuf` (protobuf-es) messages:
  `ProtobufEsBinaryPayloadConverter`, `ProtobufEsJsonPayloadConverter`, and the
  `DefaultPayloadConverterWithProtobufsEs` composite.
- `createProtobufEsPayloadConverter` helper accepting a `Registry`, an array of
  generated `DescMessage` schemas, or an options object with explicit
  `encoding: "binary" | "json"`. `binary` is the default for cross-language
  Temporal payload compatibility.
- `create*` and `make*` helper aliases, plus encoding-specific
  `createBinaryProtobufEsPayloadConverter` / `createJsonProtobufEsPayloadConverter`.
- Explicit schema registration for all message types, including well-known types.
- ESM and CommonJS entrypoints so `dataConverter.payloadConverterPath` modules
  load through Temporal's synchronous `require(...)`.

[Unreleased]: https://github.com/nu-sync/temporal-protobuf-es/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/nu-sync/temporal-protobuf-es/releases/tag/v0.0.1
