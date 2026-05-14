const { TimestampSchema } = require("@bufbuild/protobuf/wkt");
const {
  makeBinaryProtobufEsPayloadConverter,
} = require("@nu-sync/temporal-protobuf-es");

exports.payloadConverter = makeBinaryProtobufEsPayloadConverter([
  TimestampSchema,
]);
