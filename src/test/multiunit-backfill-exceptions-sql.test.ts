import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sqlPath = resolve(
  process.cwd(),
  "supabase/diagnostics/20260918_multiunit_backfill_exceptions_readonly.sql",
);

const sql = existsSync(sqlPath) ? readFileSync(sqlPath, "utf8") : "";

function executableSql(source: string) {
  return source
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/'(?:''|[^'])*'/g, "''")
    .toLowerCase();
}

describe("multiunit backfill exception diagnostic", () => {
  const executable = executableSql(sql);

  it("exists as a dedicated diagnostic", () => {
    expect(existsSync(sqlPath)).toBe(true);
  });

  it("opens an explicit read-only transaction", () => {
    expect(executable).toMatch(/begin\s+transaction\s+read\s+only\s*;/);
  });

  it("sets a bounded statement timeout", () => {
    expect(executable).toMatch(/set\s+local\s+statement_timeout\s*=/);
  });

  it("contains no mutating statement", () => {
    expect(executable).not.toMatch(
      /\b(insert|update|delete|merge|truncate|create|alter|drop|grant|revoke|call|copy|do)\b/,
    );
  });

  it("returns one consolidated aggregate result", () => {
    expect(executable).toContain(
      "select section, item_key, details::text as details",
    );
  });

  it.each([
    "01_document_conflicts",
    "02_unit_name_readiness",
    "03_slug_readiness",
    "04_banking_readiness",
    "05_proposal_sequence_readiness",
    "06_category_mapping_readiness",
    "07_personal_user_integrity",
  ])("covers required aggregate section %s", (section) => {
    expect(sql).toContain(`'${section}'`);
  });

  it("does not select sensitive profile values into the final report", () => {
    expect(executable).not.toMatch(
      /jsonb_build_object\([^)]*\b(document|fiscal_document|account_number|pix_key|user_id|slug)\b\s*,\s*\1\b/,
    );
  });

  it("ends the transaction", () => {
    expect(executable.trim()).toMatch(/commit\s*;$/);
  });
});
