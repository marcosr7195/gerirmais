import { z } from "zod";

const MAX_METADATA_ENTRIES = 20;
const MAX_METADATA_BYTES = 4 * 1024;

const trimmedText = (maxLength: number) =>
  z.string().trim().min(1).max(maxLength);

const isoInstantSchema = z.string().datetime({ offset: true });

const stripControlCharacters = (value: string) =>
  [...value]
    .filter((character) => {
      const codePoint = character.codePointAt(0);
      return (
        codePoint !== undefined &&
        codePoint > 0x1f &&
        (codePoint < 0x7f || codePoint > 0x9f)
      );
    })
    .join("");

const phoneSchema = z
  .string()
  .transform((value) => stripControlCharacters(value).trim())
  .pipe(z.string().min(3).max(32));

const emailSchema = z
  .string()
  .trim()
  .max(254)
  .email()
  .transform((value) => value.toLowerCase());

const metadataScalarSchema = z.union([
  z.string().max(500),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

const metadataSchema = z
  .record(z.string().min(1).max(64), metadataScalarSchema)
  .superRefine((metadata, context) => {
    if (Object.keys(metadata).length > MAX_METADATA_ENTRIES) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Metadata must contain at most ${MAX_METADATA_ENTRIES} entries`,
      });
    }

    if (new TextEncoder().encode(JSON.stringify(metadata)).byteLength > MAX_METADATA_BYTES) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Metadata must be at most ${MAX_METADATA_BYTES} bytes`,
      });
    }
  });

const consentSchema = z
  .object({
    granted: z.boolean(),
    occurred_at: isoInstantSchema.optional(),
    text: trimmedText(500).optional(),
  })
  .strict();

export const siteLeadPayloadSchema = z
  .object({
    name: trimmedText(120),
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
    external_id: trimmedText(128).optional(),
    source: trimmedText(64).optional(),
    service: trimmedText(120).optional(),
    campaign: trimmedText(120).optional(),
    utm_source: trimmedText(120).optional(),
    utm_medium: trimmedText(120).optional(),
    utm_campaign: trimmedText(120).optional(),
    utm_term: trimmedText(120).optional(),
    utm_content: trimmedText(120).optional(),
    message: trimmedText(2_000).optional(),
    consent: consentSchema.optional(),
    occurred_at: isoInstantSchema.optional(),
    metadata: metadataSchema.optional(),
  })
  .strict()
  .refine((payload) => payload.phone !== undefined || payload.email !== undefined, {
    message: "Phone or email is required",
    path: ["phone"],
  });

export type SiteLeadPayloadInput = z.input<typeof siteLeadPayloadSchema>;
export type SiteLeadPayload = z.output<typeof siteLeadPayloadSchema>;

export function parseSiteLeadPayload(input: unknown): SiteLeadPayload {
  return siteLeadPayloadSchema.parse(input);
}

export interface SiteLeadRequestMeta {
  method?: unknown;
  contentType?: unknown;
  bodySizeBytes?: unknown;
  authorization?: unknown;
  idempotencyKey?: unknown;
  [key: string]: unknown;
}

export type SiteLeadRequestErrorCode =
  | "METHOD_NOT_ALLOWED"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "INVALID_BODY_SIZE"
  | "PAYLOAD_TOO_LARGE"
  | "INVALID_IDEMPOTENCY_KEY"
  | "UNAUTHORIZED";

export type SiteLeadRequestValidationResult =
  | { ok: true }
  | {
      ok: false;
      status: 400 | 401 | 413 | 415;
      code: SiteLeadRequestErrorCode;
      message: string;
    };

const requestError = (
  status: 400 | 401 | 413 | 415,
  code: SiteLeadRequestErrorCode,
  message: string,
): SiteLeadRequestValidationResult => ({ ok: false, status, code, message });

export function validateSiteLeadRequestMeta(
  metadata: SiteLeadRequestMeta,
): SiteLeadRequestValidationResult {
  if (metadata.method !== "POST") {
    return requestError(400, "METHOD_NOT_ALLOWED", "Método não permitido");
  }

  if (
    typeof metadata.contentType !== "string" ||
    metadata.contentType.split(";", 1)[0].trim().toLowerCase() !==
      "application/json"
  ) {
    return requestError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Tipo de conteúdo não suportado",
    );
  }

  if (
    typeof metadata.bodySizeBytes !== "number" ||
    !Number.isSafeInteger(metadata.bodySizeBytes) ||
    metadata.bodySizeBytes < 0
  ) {
    return requestError(400, "INVALID_BODY_SIZE", "Tamanho do corpo inválido");
  }

  if (metadata.bodySizeBytes > 32 * 1_024) {
    return requestError(413, "PAYLOAD_TOO_LARGE", "Corpo excede 32 KiB");
  }

  if (typeof metadata.idempotencyKey !== "string") {
    return requestError(
      400,
      "INVALID_IDEMPOTENCY_KEY",
      "Chave de idempotência inválida",
    );
  }

  const idempotencyKeyLength = metadata.idempotencyKey.trim().length;
  if (idempotencyKeyLength < 8 || idempotencyKeyLength > 128) {
    return requestError(
      400,
      "INVALID_IDEMPOTENCY_KEY",
      "Chave de idempotência inválida",
    );
  }

  if (
    typeof metadata.authorization !== "string" ||
    !/^Bearer [^\s]+$/.test(metadata.authorization)
  ) {
    return requestError(401, "UNAUTHORIZED", "Autorização obrigatória");
  }

  return { ok: true };
}
