import { describe, expect, it, vi } from "vitest";
import {
  createSiteLeadHandler,
  type SiteLeadIngest,
} from "../../supabase/functions/_shared/site-lead-handler";

const pepper = "local-test-pepper-never-a-real-secret";
const bearer = "integration-secret-token";
const idempotencyKey = "lead-20260921-0001";

function request(
  body: string | object,
  headers: Record<string, string> = {},
): Request {
  return new Request("http://localhost/functions/v1/site-lead-webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${bearer}`,
      "idempotency-key": idempotencyKey,
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function responseBody(response: Response) {
  return (await response.json()) as Record<string, unknown>;
}

function ingestReturning(status: "created" | "duplicate" | "conflict") {
  return vi.fn<SiteLeadIngest>().mockResolvedValue({ status });
}

describe("site lead HTTP handler", () => {
  it.each([
    ["created", 201, "CREATED"],
    ["duplicate", 200, "DUPLICATE"],
    ["conflict", 409, "IDEMPOTENCY_CONFLICT"],
  ] as const)("maps %s from persistence to a stable response", async (status, httpStatus, code) => {
    const ingest = ingestReturning(status);
    const response = await createSiteLeadHandler({ ingest, pepper })(
      request({ name: "Maria", phone: "+55 11 99999-9999" }),
    );

    expect(response.status).toBe(httpStatus);
    expect(await responseBody(response)).toEqual({ ok: status !== "conflict", code });
  });

  it("rejects malformed JSON without calling persistence", async () => {
    const ingest = ingestReturning("created");
    const response = await createSiteLeadHandler({ ingest, pepper })(request('{"name":'));

    expect(response.status).toBe(400);
    expect(await responseBody(response)).toEqual({
      ok: false,
      code: "INVALID_JSON",
      message: "JSON inválido",
    });
    expect(ingest).not.toHaveBeenCalled();
  });

  it("rejects a valid JSON document outside the payload contract", async () => {
    const ingest = ingestReturning("created");
    const response = await createSiteLeadHandler({ ingest, pepper })(
      request({ name: "Maria", organization_id: "forged" }),
    );

    expect(response.status).toBe(422);
    expect(await responseBody(response)).toEqual({
      ok: false,
      code: "INVALID_PAYLOAD",
      message: "Payload inválido",
    });
    expect(ingest).not.toHaveBeenCalled();
  });

  it("measures actual UTF-8 bytes and rejects a body above 32 KiB before parsing", async () => {
    const ingest = ingestReturning("created");
    const oversized = `"${"á".repeat(16_384)}"`;
    expect(oversized.length).toBeLessThanOrEqual(32 * 1_024);
    expect(new TextEncoder().encode(oversized).byteLength).toBeGreaterThan(32 * 1_024);

    const response = await createSiteLeadHandler({ ingest, pepper })(request(oversized));

    expect(response.status).toBe(413);
    expect(await responseBody(response)).toMatchObject({ ok: false, code: "PAYLOAD_TOO_LARGE" });
    expect(ingest).not.toHaveBeenCalled();
  });

  it("rejects malformed authorization without exposing it", async () => {
    const ingest = ingestReturning("created");
    const secret = "should-never-be-reflected";
    const response = await createSiteLeadHandler({ ingest, pepper })(
      request({ name: "Maria", phone: "12345678" }, { authorization: `Basic ${secret}` }),
    );
    const serialized = JSON.stringify(await responseBody(response));

    expect(response.status).toBe(401);
    expect(serialized).not.toContain(secret);
    expect(ingest).not.toHaveBeenCalled();
  });

  it("creates deterministic domain-separated digests and never passes raw secrets", async () => {
    const firstIngest = ingestReturning("created");
    const secondIngest = ingestReturning("created");
    const payload = { name: " Maria ", email: " MARIA@EXAMPLE.COM " };

    await createSiteLeadHandler({ ingest: firstIngest, pepper })(request(payload));
    await createSiteLeadHandler({ ingest: secondIngest, pepper })(request(payload));

    const first = firstIngest.mock.calls[0][0];
    const second = secondIngest.mock.calls[0][0];
    expect(first.credentialDigestHex).toMatch(/^[a-f0-9]{64}$/);
    expect(first.credentialDigestHex).toBe(
      "8fd4d442c315549f4ffbae49eecc487abb1d1f5d0d6f5a459f1236b9cdc890ce",
    );
    expect(first.idempotencyKeyDigestHex).toMatch(/^[a-f0-9]{64}$/);
    expect(first).toEqual(second);
    expect(first.credentialDigestHex).not.toBe(first.idempotencyKeyDigestHex);
    expect(JSON.stringify(first)).not.toContain(bearer);
    expect(JSON.stringify(first)).not.toContain(idempotencyKey);
  });

  it("calls persistence only with the normalized payload and no tenant authority", async () => {
    const ingest = ingestReturning("created");
    await createSiteLeadHandler({ ingest, pepper })(
      request({ name: " Maria ", email: " MARIA@EXAMPLE.COM " }),
    );

    expect(ingest).toHaveBeenCalledTimes(1);
    expect(ingest.mock.calls[0][0].payload).toEqual({
      name: "Maria",
      email: "maria@example.com",
    });
    expect(JSON.stringify(ingest.mock.calls[0][0].payload)).not.toMatch(
      /organization|business_unit|tenant|integration_id/,
    );
  });

  it("maps database authorization failures to 403 without leaking details", async () => {
    const leaked = "token-or-event-id-that-must-not-leak";
    const ingest = vi.fn<SiteLeadIngest>().mockRejectedValue({ code: "28000", message: leaked });
    const response = await createSiteLeadHandler({ ingest, pepper })(
      request({ name: "Maria", phone: "12345678" }),
    );
    const serialized = JSON.stringify(await responseBody(response));

    expect(response.status).toBe(403);
    expect(serialized).toBe(
      JSON.stringify({ ok: false, code: "FORBIDDEN", message: "Credencial não autorizada" }),
    );
    expect(serialized).not.toContain(leaked);
  });

  it("maps unknown persistence failures to generic 500 without PII or internal identifiers", async () => {
    const sensitive = [bearer, idempotencyKey, "maria@example.com", "event-private-123"];
    const ingest = vi
      .fn<SiteLeadIngest>()
      .mockRejectedValue(new Error(`database failed ${sensitive.join(" ")}`));
    const response = await createSiteLeadHandler({ ingest, pepper })(
      request({ name: "Maria", email: "maria@example.com" }),
    );
    const serialized = JSON.stringify(await responseBody(response));

    expect(response.status).toBe(500);
    expect(JSON.parse(serialized)).toEqual({
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Falha interna",
    });
    for (const value of sensitive) expect(serialized).not.toContain(value);
  });

  it("rejects oversized Content-Length before reading the body", async () => {
    const ingest = ingestReturning("created");
    let bodyAccessed = false;
    const streamedRequest = {
      method: "POST",
      headers: new Headers({
        "content-type": "application/json", authorization: `Bearer ${bearer}`,
        "idempotency-key": idempotencyKey, "content-length": String(32 * 1_024 + 1),
      }),
      get body() { bodyAccessed = true; return null; },
    } as unknown as Request;
    const response = await createSiteLeadHandler({ ingest, pepper })(streamedRequest);
    expect(response.status).toBe(413);
    expect(bodyAccessed).toBe(false);
  });

  it("cancels a chunked stream as soon as it exceeds 32 KiB", async () => {
    const ingest = ingestReturning("created");
    let pulls = 0;
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) { pulls += 1; controller.enqueue(new Uint8Array(16_385)); },
      cancel() { cancelled = true; },
    });
    const streamedRequest = new Request("http://localhost/functions/v1/site-lead-webhook", {
      method: "POST",
      headers: {
        "content-type": "application/json", authorization: `Bearer ${bearer}`,
        "idempotency-key": idempotencyKey,
      },
      body, duplex: "half",
    } as RequestInit & { duplex: string });
    const response = await createSiteLeadHandler({ ingest, pepper })(streamedRequest);
    expect(response.status).toBe(413);
    expect(pulls).toBeLessThanOrEqual(3);
    expect(cancelled).toBe(true);
    expect(ingest).not.toHaveBeenCalled();
  });

  it("handles request stream read failures without persistence", async () => {
    const ingest = ingestReturning("created");
    const body = new ReadableStream<Uint8Array>({ pull() { throw new Error("read failed"); } });
    const streamedRequest = new Request("http://localhost/functions/v1/site-lead-webhook", {
      method: "POST",
      headers: {
        "content-type": "application/json", authorization: `Bearer ${bearer}`,
        "idempotency-key": idempotencyKey,
      },
      body, duplex: "half",
    } as RequestInit & { duplex: string });
    const response = await createSiteLeadHandler({ ingest, pepper })(streamedRequest);
    expect(response.status).toBe(400);
    expect(await responseBody(response)).toMatchObject({ code: "INVALID_JSON" });
    expect(ingest).not.toHaveBeenCalled();
  });

  it("maps database contract rejections to 422", async () => {
    const ingest = vi.fn<SiteLeadIngest>().mockRejectedValue({ code: "22023" });
    const response = await createSiteLeadHandler({ ingest, pepper })(
      request({ name: "Maria", phone: "12345678" }),
    );
    expect(response.status).toBe(422);
    expect(await responseBody(response)).toEqual({
      ok: false, code: "INVALID_PAYLOAD", message: "Payload inválido",
    });
  });
});
