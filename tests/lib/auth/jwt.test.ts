import { describe, it, expect } from "vitest";
import { signToken, verifyToken, TokenPayload } from "@/lib/auth/jwt";

/**
 * Set a deterministic secret for the entire suite. The jwt module falls back
 * to `process.env.JWT_SECRET ?? 'test-secret'`, so we pin it here to make
 * sign/verify round-trips predictable.
 */
process.env.JWT_SECRET = "test-secret";

describe("jwt", () => {
  const basePayload: TokenPayload = {
    id: "65a1f2b3c4d5e6f7a8b9c0d1",
    username: "admin",
  };

  describe("signToken + verifyToken round-trip", () => {
    it("returns the original payload for a freshly signed token", () => {
      const token = signToken(basePayload);
      const decoded = verifyToken(token);
      expect(decoded).toEqual(basePayload);
    });

    it("includes iat and exp within the expected 7-day window", () => {
      const before = Math.floor(Date.now() / 1000);
      const token = signToken(basePayload);
      const after = Math.floor(Date.now() / 1000);

      const [, encodedPayload] = token.split(".");
      const payload = JSON.parse(
        Buffer.from(encodedPayload, "base64url").toString("utf8"),
      );

      expect(payload.iat).toBeGreaterThanOrEqual(before - 1);
      expect(payload.iat).toBeLessThanOrEqual(after + 1);
      expect(payload.exp - payload.iat).toBeGreaterThanOrEqual(7 * 24 * 60 * 60 - 2);
      expect(payload.exp - payload.iat).toBeLessThanOrEqual(7 * 24 * 60 * 60 + 2);
    });
  });

  describe("expiry handling", () => {
    it("returns null for an expired token", () => {
      const token = signToken(basePayload);
      const [, encodedPayload, signature] = token.split(".");

      const payload = JSON.parse(
        Buffer.from(encodedPayload, "base64url").toString("utf8"),
      );
      payload.exp = Math.floor(Date.now() / 1000) - 10;

      const forgedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
      const expiredToken = `${token.split(".")[0]}.${forgedPayload}.${signature}`;

      expect(verifyToken(expiredToken)).toBeNull();
    });
  });

  describe("tampered-token rejection", () => {
    it("returns null when the signature is randomized", () => {
      const token = signToken(basePayload);
      const [, , signature] = token.split(".");
      const mangled = signature
        .split("")
        .map((char, idx) => (idx === 0 ? (char === "A" ? "B" : "A") : char))
        .join("");

      expect(verifyToken(`${token.split(".")[0]}.${token.split(".")[1]}.${mangled}`)).toBeNull();
    });

    it("returns null for a structurally malformed token", () => {
      expect(verifyToken("not-a-jwt")).toBeNull();
      expect(verifyToken("a.b")).toBeNull();
      expect(verifyToken("")).toBeNull();
    });
  });

  describe("jwt-secret safety", () => {
    const plaintext = "this-is-a-secret";

    it("does not expose the supplied secret in the encoded token string", () => {
      const token = signToken(basePayload);
      expect(token).not.toContain(plaintext);
    });

    it("verifyToken with an unrelated secret returns null without throwing", () => {
      const token = signToken(basePayload);
      expect(verifyToken(token)).not.toBeNull();
      const previous = process.env.JWT_SECRET;
      try {
        process.env.JWT_SECRET = "other-secret";
        expect(verifyToken(token)).toBeNull();
      } finally {
        process.env.JWT_SECRET = previous;
      }
    });
  });

  describe("payload manipulation rejection", () => {
    it("rejects token with tampered id field", () => {
      const token = signToken(basePayload);
      const [header, payload, signature] = token.split(".");
      const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
      decoded.id = "tampered-id";
      const forgedPayload = Buffer.from(JSON.stringify(decoded)).toString("base64url");
      const forgedToken = `${header}.${forgedPayload}.${signature}`;
      expect(verifyToken(forgedToken)).toBeNull();
    });

    it("rejects token with tampered username field", () => {
      const token = signToken(basePayload);
      const [header, payload, signature] = token.split(".");
      const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
      decoded.username = "tampered-user";
      const forgedPayload = Buffer.from(JSON.stringify(decoded)).toString("base64url");
      const forgedToken = `${header}.${forgedPayload}.${signature}`;
      expect(verifyToken(forgedToken)).toBeNull();
    });
  });

  describe("expiry boundary", () => {
    it("returns null when exp equals current time (token just expired)", () => {
      const token = signToken(basePayload);
      const [header, payload, signature] = token.split(".");
      const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
      decoded.exp = Math.floor(Date.now() / 1000);
      const forgedPayload = Buffer.from(JSON.stringify(decoded)).toString("base64url");
      const expiredToken = `${header}.${forgedPayload}.${signature}`;
      expect(verifyToken(expiredToken)).toBeNull();
    });
  });
});
