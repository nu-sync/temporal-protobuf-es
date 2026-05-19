import { EmptySchema } from "@bufbuild/protobuf/wkt";
import {
  StartOrderRequestSchema,
  StartOrderResultSchema,
} from "./orders_pb.js";

export const schemas = [
  EmptySchema,
  StartOrderRequestSchema,
  StartOrderResultSchema,
];
