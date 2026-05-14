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

export interface ProtobufEsPayloadConverterOptions {
  readonly registry: ProtobufEsRegistryInput;
  readonly encode?: ProtobufEsEncodePreference;
}

abstract class ProtobufEsPayloadConverter implements PayloadConverterWithEncoding {
  protected readonly registry: Registry | undefined;
  public abstract readonly encodingType: string;

  protected constructor(registryOrSchemas?: ProtobufEsRegistryInput) {
    if (registryOrSchemas === undefined) {
      return;
    }

    this.registry = normalizeRegistry(registryOrSchemas);
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
    message,
  }: {
    readonly messageTypeName: string;
    readonly message: Uint8Array;
  }): Payload {
    return {
      metadata: {
        [METADATA_ENCODING_KEY]: encodeString(this.encodingType),
        [METADATA_MESSAGE_TYPE_KEY]: encodeString(messageTypeName),
      },
      data: message,
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
      message: toBinary(schema, value),
    });
  }

  public fromPayload<T>(payload: Payload): T {
    const { schema, data } = this.validatePayload(payload);
    const localData = new Uint8Array(data.buffer, data.byteOffset, data.length);
    return fromBinary(schema, localData) as T;
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
      message: encodeString(JSON.stringify(toJson(schema, value, jsonOptions))),
    });
  }

  public fromPayload<T>(payload: Payload): T {
    const { schema, data } = this.validatePayload(payload);
    const jsonOptions = this.registry ? { registry: this.registry } : undefined;
    return fromJson(schema, JSON.parse(decodeString(data)), jsonOptions) as T;
  }
}

export interface DefaultPayloadConverterWithProtobufsEsOptions {
  readonly registry: ProtobufEsRegistryInput;
  readonly encode?: ProtobufEsEncodePreference;
}

export class DefaultPayloadConverterWithProtobufsEs extends CompositePayloadConverter {
  public readonly encode: ProtobufEsEncodePreference;

  public constructor(options: DefaultPayloadConverterWithProtobufsEsOptions) {
    const encode = normalizeEncodePreference(options.encode);
    const registry = normalizeRegistry(options.registry);
    const [firstProtobufConverter, secondProtobufConverter] =
      makeOrderedProtobufConverters(registry, encode);

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

export function makeProtobufEsPayloadConverter(
  registryOrOptions:
    | ProtobufEsRegistryInput
    | ProtobufEsPayloadConverterOptions,
): DefaultPayloadConverterWithProtobufsEs {
  return new DefaultPayloadConverterWithProtobufsEs(
    normalizePayloadConverterOptions(registryOrOptions),
  );
}

export function makeBinaryProtobufEsPayloadConverter(
  registryOrSchemas: ProtobufEsRegistryInput,
): DefaultPayloadConverterWithProtobufsEs {
  return makeProtobufEsPayloadConverter({
    registry: registryOrSchemas,
    encode: "binary",
  });
}

export function makeJsonProtobufEsPayloadConverter(
  registryOrSchemas: ProtobufEsRegistryInput,
): DefaultPayloadConverterWithProtobufsEs {
  return makeProtobufEsPayloadConverter({
    registry: registryOrSchemas,
    encode: "json",
  });
}

function makeOrderedProtobufConverters(
  registryOrSchemas: ProtobufEsRegistryInput,
  encode: ProtobufEsEncodePreference,
): readonly [PayloadConverterWithEncoding, PayloadConverterWithEncoding] {
  const binary = new ProtobufEsBinaryPayloadConverter(registryOrSchemas);
  const json = new ProtobufEsJsonPayloadConverter(registryOrSchemas);

  return encode === "binary" ? [binary, json] : [json, binary];
}

function normalizePayloadConverterOptions(
  registryOrOptions:
    | ProtobufEsRegistryInput
    | ProtobufEsPayloadConverterOptions,
): DefaultPayloadConverterWithProtobufsEsOptions {
  if (isPayloadConverterOptions(registryOrOptions)) {
    return {
      registry: registryOrOptions.registry,
      encode: normalizeEncodePreference(registryOrOptions.encode),
    };
  }

  return {
    registry: registryOrOptions,
    encode: "binary",
  };
}

function isPayloadConverterOptions(
  value: ProtobufEsRegistryInput | ProtobufEsPayloadConverterOptions,
): value is ProtobufEsPayloadConverterOptions {
  return isRecord(value) && "registry" in value;
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
  if (!isRecord(value)) {
    return false;
  }

  const registryCandidate = value as {
    readonly kind?: unknown;
    readonly getMessage?: unknown;
  };

  return (
    registryCandidate.kind === "registry" &&
    typeof registryCandidate.getMessage === "function"
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
