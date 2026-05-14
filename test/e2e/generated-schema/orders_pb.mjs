// Handwritten fixture that mirrors @bufbuild/protoc-gen-es v2 output shape.
import { fileDesc, messageDesc } from "@bufbuild/protobuf/codegenv2";

export const file_test_e2e_generated_schema_orders = fileDesc(
  "CiZ0ZXN0L2UyZS9nZW5lcmF0ZWQtc2NoZW1hL29yZGVycy5wcm90bxIbdGVtcG9yYWwucHJvdG9idWZlcy5maXh0dXJlIkUKEVN0YXJ0T3JkZXJSZXF1ZXN0EhAKCG9yZGVyX2lkGAEgASgJEhAKCHF1YW50aXR5GAIgASgFEgwKBHRhZ3MYAyADKAkiNgoQU3RhcnRPcmRlclJlc3VsdBIQCghvcmRlcl9pZBgBIAEoCRIQCghhY2NlcHRlZBgCIAEoCGIGcHJvdG8z",
);

export const StartOrderRequestSchema = messageDesc(
  file_test_e2e_generated_schema_orders,
  0,
);

export const StartOrderResultSchema = messageDesc(
  file_test_e2e_generated_schema_orders,
  1,
);
