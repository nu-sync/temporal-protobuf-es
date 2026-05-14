import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DefaultPayloadConverterWithProtobufsEs,
  ProtobufEsBinaryPayloadConverter,
  ProtobufEsJsonPayloadConverter,
  makeProtobufEsPayloadConverter,
} from "../../dist/index.js";

test("package skeleton exports the planned converter API", () => {
  assert.equal(typeof ProtobufEsBinaryPayloadConverter, "function");
  assert.equal(typeof ProtobufEsJsonPayloadConverter, "function");
  assert.equal(typeof DefaultPayloadConverterWithProtobufsEs, "function");
  assert.equal(typeof makeProtobufEsPayloadConverter, "function");
});

test("helper returns the default converter shell", () => {
  const converter = makeProtobufEsPayloadConverter([]);

  assert.ok(converter instanceof DefaultPayloadConverterWithProtobufsEs);
});
