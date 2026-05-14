const { TimestampSchema } = require("@bufbuild/protobuf/wkt");
const {
  createBinaryProtobufEsPayloadConverter,
} = require("@nu-sync/temporal-protobuf-es");

exports.payloadConverter = createBinaryProtobufEsPayloadConverter([
  TimestampSchema,
]);
