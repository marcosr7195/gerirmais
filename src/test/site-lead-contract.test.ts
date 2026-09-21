import { describe, expect, it } from "vitest";
import {
  parseSiteLeadPayload,
  validateSiteLeadRequestMeta,
} from "../../supabase/functions/_shared/site-lead-contract";

const validPayload = {
  name: "Maria Silva",
  phone: "+55 (11) 99999-9999",
};

describe("site lead payload contract", () => {
  it("accepts a lead with name and phone", () => {
    expect(parseSiteLeadPayload(validPayload)).toEqual(validPayload);
  });

  it("accepts a lead with name and email", () => {
    expect(
      parseSiteLeadPayload({ name: "Maria Silva", email: "maria@example.com" }),
    ).toEqual({ name: "Maria Silva", email: "maria@example.com" });
  });

  it("requires at least phone or email", () => {
    expect(() => parseSiteLeadPayload({ name: "Maria Silva" })).toThrow();
  });

  it.each(["business_unit_id", "organization_id", "unit_id", "user_id"])(
    "rejects the tenant identifier %s at the payload top level",
    (tenantField) => {
      expect(() =>
        parseSiteLeadPayload({ ...validPayload, [tenantField]: "forged-id" }),
      ).toThrow();
    },
  );

  it.each([
    ["name", "x".repeat(121)],
    ["phone", "1".repeat(33)],
    ["email", `${"a".repeat(243)}@example.com`],
    ["external_id", "x".repeat(129)],
    ["source", "x".repeat(65)],
    ["service", "x".repeat(121)],
    ["campaign", "x".repeat(121)],
    ["utm_source", "x".repeat(121)],
    ["message", "x".repeat(2001)],
  ])("rejects %s above its string limit", (field, value) => {
    expect(() =>
      parseSiteLeadPayload({ ...validPayload, [field]: value }),
    ).toThrow();
  });

  it("normalizes email casing and surrounding whitespace", () => {
    expect(
      parseSiteLeadPayload({
        name: "Maria Silva",
        email: "  MARIA.SILVA@EXAMPLE.COM  ",
      }).email,
    ).toBe("maria.silva@example.com");
  });

  it("keeps phone as sanitized text without assuming a country", () => {
    expect(
      parseSiteLeadPayload({
        name: "Maria Silva",
        phone: " \t+351 912 345 678\u0000\n",
      }).phone,
    ).toBe("+351 912 345 678");
  });

  it("accepts only bounded scalar metadata", () => {
    expect(
      parseSiteLeadPayload({
        ...validPayload,
        metadata: {
          landing_version: 2,
          qualified: true,
          referral: null,
          segment: "enterprise",
        },
      }).metadata,
    ).toEqual({
      landing_version: 2,
      qualified: true,
      referral: null,
      segment: "enterprise",
    });

    expect(() =>
      parseSiteLeadPayload({ ...validPayload, metadata: { nested: { a: 1 } } }),
    ).toThrow();
    expect(() =>
      parseSiteLeadPayload({ ...validPayload, metadata: { list: [1, 2] } }),
    ).toThrow();
    expect(() =>
      parseSiteLeadPayload({
        ...validPayload,
        metadata: Object.fromEntries(
          Array.from({ length: 21 }, (_, index) => [`key_${index}`, index]),
        ),
      }),
    ).toThrow();
    const oversizedMetadata = Object.fromEntries(
      Array.from({ length: 9 }, (_, index) => [
        `key_${index}`,
        "x".repeat(500),
      ]),
    );
    expect(Object.keys(oversizedMetadata)).toHaveLength(9);
    expect(Object.values(oversizedMetadata).every((value) => value.length <= 500)).toBe(
      true,
    );
    expect(
      new TextEncoder().encode(JSON.stringify(oversizedMetadata)).byteLength,
    ).toBeGreaterThan(4_096);
    expect(() =>
      parseSiteLeadPayload({ ...validPayload, metadata: oversizedMetadata }),
    ).toThrow();
  });

  it("validates consent and ISO-8601 instants with timezone", () => {
    const result = parseSiteLeadPayload({
      ...validPayload,
      occurred_at: "2026-09-21T14:30:00-03:00",
      consent: {
        granted: true,
        occurred_at: "2026-09-21T17:30:00Z",
        text: "Aceito receber contato.",
      },
    });

    expect(result.consent?.granted).toBe(true);
    expect(() =>
      parseSiteLeadPayload({
        ...validPayload,
        occurred_at: "2026-09-21T14:30:00",
      }),
    ).toThrow();
    expect(() =>
      parseSiteLeadPayload({
        ...validPayload,
        consent: { granted: "yes" },
      }),
    ).toThrow();
  });

  it("rejects unknown fields", () => {
    expect(() =>
      parseSiteLeadPayload({ ...validPayload, unexpected: "value" }),
    ).toThrow();
  });
});

const validRequestMeta = {
  method: "POST",
  contentType: "application/json",
  bodySizeBytes: 1_024,
  authorization: "Bearer server-secret-token",
  idempotencyKey: "lead-20260921-0001",
};

describe("site lead HTTP request metadata contract", () => {
  it("accepts POST JSON metadata without exposing credentials", () => {
    expect(validateSiteLeadRequestMeta(validRequestMeta)).toEqual({ ok: true });
    expect(
      validateSiteLeadRequestMeta({
        ...validRequestMeta,
        contentType: "application/json; charset=utf-8",
      }),
    ).toEqual({ ok: true });
  });

  it("rejects methods other than POST with a stable technical response", () => {
    expect(
      validateSiteLeadRequestMeta({ ...validRequestMeta, method: "GET" }),
    ).toEqual({
      ok: false,
      status: 400,
      code: "METHOD_NOT_ALLOWED",
      message: "Método não permitido",
    });
  });

  it.each(["text/plain", "application/x-www-form-urlencoded", undefined])(
    "rejects a non-JSON content type (%s)",
    (contentType) => {
      expect(
        validateSiteLeadRequestMeta({ ...validRequestMeta, contentType }),
      ).toMatchObject({
        ok: false,
        status: 415,
        code: "UNSUPPORTED_MEDIA_TYPE",
      });
    },
  );

  it("enforces the 32 KiB body limit in bytes", () => {
    expect(
      validateSiteLeadRequestMeta({
        ...validRequestMeta,
        bodySizeBytes: 32 * 1_024,
      }),
    ).toEqual({ ok: true });
    expect(
      validateSiteLeadRequestMeta({
        ...validRequestMeta,
        bodySizeBytes: 32 * 1_024 + 1,
      }),
    ).toMatchObject({
      ok: false,
      status: 413,
      code: "PAYLOAD_TOO_LARGE",
    });
  });

  it.each([-1, 1.5, Number.NaN])(
    "rejects an invalid byte count (%s)",
    (bodySizeBytes) => {
      expect(
        validateSiteLeadRequestMeta({ ...validRequestMeta, bodySizeBytes }),
      ).toMatchObject({ ok: false, status: 400, code: "INVALID_BODY_SIZE" });
    },
  );

  it("requires an idempotency key between 8 and 128 trimmed characters", () => {
    for (const idempotencyKey of [undefined, "short", "x".repeat(129)]) {
      expect(
        validateSiteLeadRequestMeta({ ...validRequestMeta, idempotencyKey }),
      ).toMatchObject({
        ok: false,
        status: 400,
        code: "INVALID_IDEMPOTENCY_KEY",
      });
    }

    expect(
      validateSiteLeadRequestMeta({
        ...validRequestMeta,
        idempotencyKey: `  ${"x".repeat(8)}  `,
      }),
    ).toEqual({ ok: true });
    expect(
      validateSiteLeadRequestMeta({
        ...validRequestMeta,
        idempotencyKey: "x".repeat(128),
      }),
    ).toEqual({ ok: true });
  });

  it.each([
    undefined,
    "",
    "Basic credentials",
    "Bearer",
    "Bearer ",
    "Bearer token with spaces",
  ])("requires a well-formed Bearer credential (%s)", (authorization) => {
    expect(
      validateSiteLeadRequestMeta({ ...validRequestMeta, authorization }),
    ).toMatchObject({
      ok: false,
      status: 401,
      code: "UNAUTHORIZED",
    });
  });

  it("never includes the Bearer, idempotency key, or PII in results", () => {
    const sensitiveValues = [
      "server-secret-token",
      "lead-20260921-0001",
      "maria@example.com",
      "+55 11 99999-9999",
    ];
    const result = validateSiteLeadRequestMeta({
      ...validRequestMeta,
      method: "GET",
      name: "Maria Silva",
      email: "maria@example.com",
      phone: "+55 11 99999-9999",
    });
    const serializedResult = JSON.stringify(result);

    for (const sensitiveValue of sensitiveValues) {
      expect(serializedResult).not.toContain(sensitiveValue);
    }
  });
});
