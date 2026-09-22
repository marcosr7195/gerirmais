import { ZodError } from "zod";
import {
  parseSiteLeadPayload,
  type SiteLeadPayload,
  validateSiteLeadRequestMeta,
} from "./site-lead-contract.ts";

const MAX_BODY_BYTES = 32 * 1_024;

export interface SiteLeadIngestInput {
  credentialDigestHex: string;
  idempotencyKeyDigestHex: string;
  payload: SiteLeadPayload;
}

export type SiteLeadIngestResult = {
  status: "created" | "duplicate" | "conflict";
};

export type SiteLeadIngest = (
  input: SiteLeadIngestInput,
) => Promise<SiteLeadIngestResult>;

export interface SiteLeadHandlerDependencies {
  ingest: SiteLeadIngest;
  pepper: string;
}

type PublicErrorCode =
  | "INVALID_JSON"
  | "INVALID_PAYLOAD"
  | "FORBIDDEN"
  | "INTERNAL_ERROR";

const jsonHeaders = { "content-type": "application/json; charset=utf-8" };

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });
}

function errorResponse(
  status: number,
  code: PublicErrorCode | string,
  message: string,
): Response {
  return jsonResponse(status, { ok: false, code, message });
}

function bytesToHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256Hex(
  pepper: string,
  domain: string,
  value: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pepper),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${domain}\0${value}`),
  );
  return bytesToHex(digest);
}

function databaseErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

async function readBoundedBody(request: Request): Promise<Uint8Array> {
  if (request.body === null) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel("payload too large").catch(() => undefined);
        throw new RangeError("payload too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export function createSiteLeadHandler({
  ingest,
  pepper,
}: SiteLeadHandlerDependencies): (request: Request) => Promise<Response> {
  if (pepper.length === 0) throw new Error("SITE_LEAD_CREDENTIAL_PEPPER is required");

  return async (request: Request): Promise<Response> => {
    const authorization = request.headers.get("authorization");
    const idempotencyKey = request.headers.get("idempotency-key");
    const contentLength = request.headers.get("content-length");
    const metadataValidation = validateSiteLeadRequestMeta({
      method: request.method,
      contentType: request.headers.get("content-type"),
      bodySizeBytes: contentLength === null ? 0 : Number(contentLength),
      authorization,
      idempotencyKey,
    });

    if (metadataValidation.ok === false) {
      return errorResponse(
        metadataValidation.status,
        metadataValidation.code,
        metadataValidation.message,
      );
    }

    let rawBody: Uint8Array;
    try {
      rawBody = await readBoundedBody(request);
    } catch (error) {
      if (error instanceof RangeError) {
        return errorResponse(413, "PAYLOAD_TOO_LARGE", "Corpo excede 32 KiB");
      }
      return errorResponse(400, "INVALID_JSON", "JSON inválido");
    }

    let untrustedPayload: unknown;
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(rawBody);
      untrustedPayload = JSON.parse(text);
    } catch {
      return errorResponse(400, "INVALID_JSON", "JSON inválido");
    }

    let payload: SiteLeadPayload;
    try {
      payload = parseSiteLeadPayload(untrustedPayload);
    } catch (error) {
      if (error instanceof ZodError) {
        return errorResponse(422, "INVALID_PAYLOAD", "Payload inválido");
      }
      return errorResponse(500, "INTERNAL_ERROR", "Falha interna");
    }

    // Validation above guarantees these are strings in their expected formats.
    const credential = (authorization as string).slice("Bearer ".length);
    const normalizedIdempotencyKey = (idempotencyKey as string).trim();

    try {
      const credentialDigestHex = await hmacSha256Hex(
        pepper,
        "site-lead/credential/v1",
        credential,
      );
      const idempotencyKeyDigestHex = await hmacSha256Hex(
        pepper,
        "site-lead/idempotency/v1",
        `${credentialDigestHex}\0${normalizedIdempotencyKey}`,
      );
      const result = await ingest({
        credentialDigestHex,
        idempotencyKeyDigestHex,
        payload,
      });

      switch (result.status) {
        case "created":
          return jsonResponse(201, { ok: true, code: "CREATED" });
        case "duplicate":
          return jsonResponse(200, { ok: true, code: "DUPLICATE" });
        case "conflict":
          return jsonResponse(409, { ok: false, code: "IDEMPOTENCY_CONFLICT" });
        default:
          return errorResponse(500, "INTERNAL_ERROR", "Falha interna");
      }
    } catch (error) {
      if (databaseErrorCode(error) === "28000") {
        return errorResponse(403, "FORBIDDEN", "Credencial não autorizada");
      }
      if (databaseErrorCode(error) === "22023") {
        return errorResponse(422, "INVALID_PAYLOAD", "Payload inválido");
      }
      return errorResponse(500, "INTERNAL_ERROR", "Falha interna");
    }
  };
}
