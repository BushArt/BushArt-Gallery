import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { z } from "zod";

export interface TokenPayload {
  id: string;
  username: string;
  jti: string;
  tokenVersion: number;
}

export const TOKEN_EXPIRY_SECONDS = 60 * 60 * 8; // 8 hours

const TokenClaimsSchema = z.object({
  id: z.string(),
  username: z.string(),
  jti: z.string(),
  tokenVersion: z.number(),
  iat: z.number(),
  exp: z.number(),
});

function base64urlEncode(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function base64urlDecode(input: string): Buffer {
  return Buffer.from(input, "base64url");
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }
  return secret;
}

export function signToken(payload: TokenPayload): string {
  const secret = getSecret();
  const header = {
    alg: "HS256" as const,
    typ: "JWT" as const,
  };

  const now = Math.floor(Date.now() / 1000);
  const body: TokenPayload & { iat: number; exp: number } = {
    ...payload,
    jti: payload.jti ?? randomUUID(),
    iat: now,
    exp: now + TOKEN_EXPIRY_SECONDS,
  };

  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(body));

  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signature = createHmac("sha256", secret)
    .update(signingInput)
    .digest("base64url");

  return `${signingInput}.${signature}`;
}

interface DecodedToken {
  id: string;
  username: string;
  jti: string;
  tokenVersion: number;
  iat: number;
  exp: number;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const [encodedHeader, encodedPayload, signature] = token.split(".");

    if (!encodedHeader || !encodedPayload || !signature) {
      return null;
    }

    let header: { alg: string; typ: string };
    try {
      header = JSON.parse(base64urlDecode(encodedHeader).toString("utf8"));
    } catch {
      return null;
    }

    if (header.alg !== "HS256") {
      return null;
    }

    const secret = getSecret();
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    const expectedSignature = createHmac("sha256", secret)
      .update(signingInput)
      .digest("base64url");

    const signatureBuffer = Buffer.from(signature, "base64url");
    const expectedBuffer = Buffer.from(expectedSignature, "base64url");

    if (signatureBuffer.length !== expectedBuffer.length) {
      return null;
    }

    if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
      return null;
    }

    const decoded = JSON.parse(
      base64urlDecode(encodedPayload).toString("utf8"),
    );

    const parsed = TokenClaimsSchema.safeParse(decoded);
    if (!parsed.success) {
      return null;
    }

    if (parsed.data.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      id: parsed.data.id,
      username: parsed.data.username,
      jti: parsed.data.jti,
      tokenVersion: parsed.data.tokenVersion,
    };
  } catch {
    return null;
  }
}
