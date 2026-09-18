import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sqlPath = resolve(
  process.cwd(),
  "supabase/diagnostics/20260915_multiunit_preflight_readonly.sql",
);

function executableSql(source: string) {
  return source
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/'(?:''|[^'])*'/g, "''")
    .toLowerCase();
}

describe("multiunit remote preflight", () => {
  const sql = readFileSync(sqlPath, "utf8");
  const executable = executableSql(sql);

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

  it("ends the transaction", () => {
    expect(executable.trim()).toMatch(/commit\s*;$/);
  });
});
