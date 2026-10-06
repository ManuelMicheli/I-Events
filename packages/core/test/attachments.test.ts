import { describe, expect, it } from "vitest";
import { ATTACHMENT_MAX_BYTES, ATTACHMENT_MIME_TYPES, formatBytes, isAllowedAttachment, storageSafeName } from "../src";

describe("attachments", () => {
  it("makes storage-safe names that keep the extension", () => {
    expect(storageSafeName("Planimetria sala è.pdf")).toBe("Planimetria-sala-e.pdf");
    expect(storageSafeName("../../etc/passwd")).toBe("etc-passwd");
    expect(storageSafeName("???")).toBe("file");
    const long = storageSafeName(`${"a".repeat(200)}.pdf`);
    expect(long).toHaveLength(120);
    expect(long.endsWith(".pdf")).toBe(true);
    expect(storageSafeName("x".repeat(130))).toMatch(/^[A-Za-z0-9._-]{1,120}$/);
  });

  it("accepts documents and images within the size limit", () => {
    expect(isAllowedAttachment("application/pdf", 1000)).toBe(true);
    expect(isAllowedAttachment("application/pdf", ATTACHMENT_MAX_BYTES + 1)).toBe(false);
    expect(isAllowedAttachment("application/x-msdownload", 1000)).toBe(false);
    expect(isAllowedAttachment("image/png", 0)).toBe(false);
  });

  it("formats sizes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(5.5 * 1024 * 1024)).toBe("5,5 MB");
  });

  it("matches the storage bucket configuration", async () => {
    const { readFileSync } = await import("node:fs");
    const sql = readFileSync(new URL("../../../supabase/migrations/20261006000400_attachments.sql", import.meta.url), "utf8");
    const bucket = sql.slice(sql.indexOf("insert into storage.buckets"), sql.indexOf("on conflict"));
    expect(bucket).toContain(String(ATTACHMENT_MAX_BYTES));
    expect([...bucket.matchAll(/'([a-z]+\/[^']+)'/g)].map((m) => m[1])).toEqual([...ATTACHMENT_MIME_TYPES]);
  });
});
