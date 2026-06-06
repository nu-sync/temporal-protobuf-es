import {
  createRegistry,
  fromBinary,
  fromJson,
  isMessage,
  toBinary,
  toJson,
  type DescMessage,
  type Registry,
} from "@bufbuild/protobuf";
import {
  BinaryPayloadConverter,
  CompositePayloadConverter,
  JsonPayloadConverter,
  PayloadConverterError,
  UndefinedPayloadConverter,
  ValueError,
  encodingTypes,
  METADATA_ENCODING_KEY,
  METADATA_MESSAGE_TYPE_KEY,
  type Payload,
  type PayloadConverterWithEncoding,
} from "@temporalio/common";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export type ProtobufEsRegistryInput = Registry | readonly DescMessage[];
export type ProtobufEsEncodePreference = "binary" | "json";

export type ProtobufEsSchemaSource =
  | { readonly registry: ProtobufEsRegistryInput; readonly schemas?: never }
  | { readonly schemas: readonly DescMessage[]; readonly registry?: never };

export type ProtobufEsPayloadConverterOptions = ProtobufEsSchemaSource & {
  readonly encode?: ProtobufEsEncodePreference;
  readonly encoding?: ProtobufEsEncodePreference;
};

type NormalizedProtobufEsPayloadConverterOptions = {
  readonly registry: Registry;
  readonly encode: ProtobufEsEncodePreference;
};

abstract class ProtobufEsPayloadConverter implements PayloadConverterWithEncoding {
  protected readonly registry: Registry | undefined;
  public abstract readonly encodingType: string;

  protected constructor(registryOrSchemas?: ProtobufEsRegistryInput) {
    this.registry =
      registryOrSchemas === undefined
        ? undefined
        : normalizeRegistry(registryOrSchemas);
  }

  public abstract toPayload<T>(value: T): Payload | undefined;
  public abstract fromPayload<T>(payload: Payload): T;

  protected validatePayload(payload: Payload): {
    readonly schema: DescMessage;
    readonly data: Uint8Array;
  } {
    if (payload.data === undefined || payload.data === null) {
      throw new ValueError("Got payload with no data");
    }

    const encoding = payload.metadata?.[METADATA_ENCODING_KEY];
    if (encoding === undefined) {
      throw new ValueError(
        `Got protobuf payload without metadata.${METADATA_ENCODING_KEY}`,
      );
    }
    const actualEncoding = decodeString(encoding);
    if (actualEncoding !== this.encodingType) {
      throw new ValueError(
        `Got protobuf payload with metadata.${METADATA_ENCODING_KEY}=${actualEncoding}; expected ${this.encodingType}`,
      );
    }

    const messageType = payload.metadata?.[METADATA_MESSAGE_TYPE_KEY];
    if (messageType === undefined) {
      throw new ValueError(
        `Got protobuf payload without metadata.${METADATA_MESSAGE_TYPE_KEY}`,
      );
    }

    return {
      schema: this.getSchemaOrThrow(decodeString(messageType)),
      data: payload.data,
    };
  }

  protected getSchemaOrThrow(messageTypeName: string): DescMessage {
    if (this.registry === undefined) {
      throw new PayloadConverterError(
        "Unable to process protobuf message without `registry` being provided",
      );
    }

    const schema = this.registry.getMessage(messageTypeName);
    if (schema === undefined) {
      throw new PayloadConverterError(
        `Got a \`${messageTypeName}\` protobuf message but cannot find corresponding message schema in \`registry\``,
      );
    }

    return schema;
  }

  protected constructPayload({
    messageTypeName,
    data,
  }: {
    readonly messageTypeName: string;
    readonly data: Uint8Array;
  }): Payload {
    return {
      metadata: {
        [METADATA_ENCODING_KEY]: encodeString(this.encodingType),
        [METADATA_MESSAGE_TYPE_KEY]: encodeString(messageTypeName),
      },
      data,
    };
  }
}

export class ProtobufEsBinaryPayloadConverter extends ProtobufEsPayloadConverter {
  public readonly encodingType = encodingTypes.METADATA_ENCODING_PROTOBUF;

  public constructor(registryOrSchemas?: ProtobufEsRegistryInput) {
    super(registryOrSchemas);
  }

  public toPayload(value: unknown): Payload | undefined {
    if (!isMessage(value)) {
      return undefined;
    }

    const schema = this.getSchemaOrThrow(value.$typeName);
    return this.constructPayload({
      messageTypeName: value.$typeName,
      data: toBinary(schema, value),
    });
  }

  public fromPayload<T>(payload: Payload): T {
    const { schema, data } = this.validatePayload(payload);
    // A Node Buffer is a view into a shared, pooled ArrayBuffer; re-wrap it as a
    // plain Uint8Array bounded to this payload so protobuf-es cannot read past
    // byteLength into adjacent buffer contents.
    const localDataView = new Uint8Array(
      data.buffer,
      data.byteOffset,
      data.length,
    );
    return fromBinary(schema, localDataView) as T;
  }
}

export class ProtobufEsJsonPayloadConverter extends ProtobufEsPayloadConverter {
  public readonly encodingType = encodingTypes.METADATA_ENCODING_PROTOBUF_JSON;

  public constructor(registryOrSchemas?: ProtobufEsRegistryInput) {
    super(registryOrSchemas);
  }

  public toPayload(value: unknown): Payload | undefined {
    if (!isMessage(value)) {
      return undefined;
    }

    const schema = this.getSchemaOrThrow(value.$typeName);
    const jsonOptions = this.registry ? { registry: this.registry } : undefined;
    return this.constructPayload({
      messageTypeName: value.$typeName,
      data: encodeString(JSON.stringify(toJson(schema, value, jsonOptions))),
    });
  }

  public fromPayload<T>(payload: Payload): T {
    const { schema, data } = this.validatePayload(payload);
    const jsonOptions = this.registry ? { registry: this.registry } : undefined;
    return fromJson(schema, JSON.parse(decodeString(data)), jsonOptions) as T;
  }
}

export type DefaultPayloadConverterWithProtobufsEsOptions =
  ProtobufEsPayloadConverterOptions;

export type ProtobufEsPayloadConverterInput =
  | ProtobufEsRegistryInput
  | ProtobufEsPayloadConverterOptions;

export class DefaultPayloadConverterWithProtobufsEs extends CompositePayloadConverter {
  public readonly encode: ProtobufEsEncodePreference;

  public constructor(options: DefaultPayloadConverterWithProtobufsEsOptions) {
    const { registry, encode } = normalizePayloadConverterOptions(options);
    const [firstProtobufConverter, secondProtobufConverter] =
      createOrderedProtobufConverters(registry, encode);

    super(
      new UndefinedPayloadConverter(),
      new BinaryPayloadConverter(),
      firstProtobufConverter,
      secondProtobufConverter,
      new JsonPayloadConverter(),
    );

    this.encode = encode;
  }
}

export function createProtobufEsPayloadConverter(
  registryOrOptions: ProtobufEsPayloadConverterInput,
): DefaultPayloadConverterWithProtobufsEs {
  return new DefaultPayloadConverterWithProtobufsEs(
    normalizePayloadConverterInput(registryOrOptions),
  );
}

export function createBinaryProtobufEsPayloadConverter(
  registryOrSchemas: ProtobufEsRegistryInput,
): DefaultPayloadConverterWithProtobufsEs {
  return createProtobufEsPayloadConverter({
    registry: registryOrSchemas,
    encode: "binary",
  });
}

export function createJsonProtobufEsPayloadConverter(
  registryOrSchemas: ProtobufEsRegistryInput,
): DefaultPayloadConverterWithProtobufsEs {
  return createProtobufEsPayloadConverter({
    registry: registryOrSchemas,
    encode: "json",
  });
}

export const makeProtobufEsPayloadConverter = createProtobufEsPayloadConverter;
export const makeBinaryProtobufEsPayloadConverter =
  createBinaryProtobufEsPayloadConverter;
export const makeJsonProtobufEsPayloadConverter =
  createJsonProtobufEsPayloadConverter;

function createOrderedProtobufConverters(
  registry: Registry,
  encode: ProtobufEsEncodePreference,
): readonly [PayloadConverterWithEncoding, PayloadConverterWithEncoding] {
  const binary = new ProtobufEsBinaryPayloadConverter(registry);
  const json = new ProtobufEsJsonPayloadConverter(registry);

  return encode === "binary" ? [binary, json] : [json, binary];
}

function normalizePayloadConverterInput(
  registryOrOptions: ProtobufEsPayloadConverterInput,
): DefaultPayloadConverterWithProtobufsEsOptions {
  if (isPayloadConverterOptions(registryOrOptions)) {
    return registryOrOptions;
  }

  return {
    registry: registryOrOptions,
  };
}

function normalizePayloadConverterOptions(
  options: DefaultPayloadConverterWithProtobufsEsOptions,
): NormalizedProtobufEsPayloadConverterOptions {
  return {
    registry: normalizeRegistry(getRegistryInput(options)),
    encode: getEncodePreference(options),
  };
}

function isPayloadConverterOptions(
  value: ProtobufEsPayloadConverterInput,
): value is ProtobufEsPayloadConverterOptions {
  return (
    isRecord(value) &&
    !isRegistry(value) &&
    ("registry" in value ||
      "schemas" in value ||
      "encode" in value ||
      "encoding" in value)
  );
}

function getRegistryInput(
  options: DefaultPayloadConverterWithProtobufsEsOptions,
): ProtobufEsRegistryInput {
  if ("registry" in options && "schemas" in options) {
    throw new TypeError("Specify either `registry` or `schemas`, not both");
  }

  if ("registry" in options) {
    return options.registry;
  }

  if ("schemas" in options) {
    return options.schemas;
  }

  throw new TypeError("`registry` or `schemas` must be provided");
}

function getEncodePreference(
  options: DefaultPayloadConverterWithProtobufsEsOptions,
): ProtobufEsEncodePreference {
  if (
    options.encode !== undefined &&
    options.encoding !== undefined &&
    options.encode !== options.encoding
  ) {
    throw new TypeError(
      "`encode` and `encoding` must agree when both are provided",
    );
  }

  return normalizeEncodePreference(options.encoding ?? options.encode);
}

function normalizeEncodePreference(
  encode: ProtobufEsEncodePreference | undefined,
): ProtobufEsEncodePreference {
  if (encode === undefined) {
    return "binary";
  }

  if (encode !== "binary" && encode !== "json") {
    throw new TypeError("`encode` must be either `binary` or `json`");
  }

  return encode;
}

function normalizeRegistry(
  registryOrSchemas: ProtobufEsRegistryInput,
): Registry {
  if (Array.isArray(registryOrSchemas)) {
    return createRegistry(...registryOrSchemas);
  }

  if (isRegistry(registryOrSchemas)) {
    return registryOrSchemas;
  }

  throw new TypeError(
    "`registry` must be a @bufbuild/protobuf Registry or an array of generated message schemas",
  );
}

function isRegistry(value: unknown): value is Registry {
  return (
    isRecord(value) &&
    value.kind === "registry" &&
    typeof value.getMessage === "function"
  );
}

function isRecord(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === "object" && value !== null;
}

function encodeString(value: string): Uint8Array {
  return textEncoder.encode(value);
}

function decodeString(value: Uint8Array): string {
  return textDecoder.decode(value);
}
