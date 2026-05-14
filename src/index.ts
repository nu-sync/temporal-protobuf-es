const packageSkeletonMessage =
  "@nu-sync/temporal-protobuf-es package skeleton is present, but converter implementation is not complete yet.";

export type ProtobufEsRegistryInput = unknown;

export class ProtobufEsBinaryPayloadConverter {
  public readonly encodingType = "binary/protobuf";

  public constructor(
    public readonly registryOrSchemas: ProtobufEsRegistryInput,
  ) {}

  public toPayload(_value: unknown): never {
    return failPackageSkeleton();
  }

  public fromPayload(_payload: unknown): never {
    return failPackageSkeleton();
  }
}

export class ProtobufEsJsonPayloadConverter {
  public readonly encodingType = "json/protobuf";

  public constructor(
    public readonly registryOrSchemas: ProtobufEsRegistryInput,
  ) {}

  public toPayload(_value: unknown): never {
    return failPackageSkeleton();
  }

  public fromPayload(_payload: unknown): never {
    return failPackageSkeleton();
  }
}

export interface DefaultPayloadConverterWithProtobufsEsOptions {
  readonly registry: ProtobufEsRegistryInput;
}

export class DefaultPayloadConverterWithProtobufsEs {
  public constructor(
    public readonly options: DefaultPayloadConverterWithProtobufsEsOptions,
  ) {}

  public toPayload(_value: unknown): never {
    return failPackageSkeleton();
  }

  public fromPayload(_payload: unknown): never {
    return failPackageSkeleton();
  }
}

export function makeProtobufEsPayloadConverter(
  registryOrSchemas: ProtobufEsRegistryInput,
): DefaultPayloadConverterWithProtobufsEs {
  return new DefaultPayloadConverterWithProtobufsEs({
    registry: registryOrSchemas,
  });
}

function failPackageSkeleton(): never {
  throw new Error(packageSkeletonMessage);
}
