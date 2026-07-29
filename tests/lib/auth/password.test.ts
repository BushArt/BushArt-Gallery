import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password", () => {
  const plaintext = "s3cure-p@ss!";

  it("hashes password and round-trips through verifyPassword", async () => {
    const hash = await hashPassword(plaintext);
    expect(hash).not.toBe(plaintext);
    expect(hash.length).toBeGreaterThan(20);
    expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);

    const ok = await verifyPassword(plaintext, hash);
    expect(ok).toBe(true);
  });

  it("rejects wrong password against a valid hash", async () => {
    const hash = await hashPassword(plaintext);
    const wrong = await verifyPassword("wrong-password", hash);
    expect(wrong).toBe(false);
  });

  it("produces different hashes across calls (random salt)", async () => {
    const first = await hashPassword(plaintext);
    const second = await hashPassword(plaintext);
    expect(first).not.toBe(second);
  });
});
