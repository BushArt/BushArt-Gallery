import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * JWT payload shape issued at sign time and accepted at verify time.
 */
export interface TokenPayload {
  id: string;
  username: string;
}

const TOKEN_EXPIRY_SECONDS = 60 * 60 * 24 * 7; // 7 days

function base64urlEncode(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function base64urlDecode(input: string): Buffer {
  return Buffer.from(input, "base64url");
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV !== "test") {
    throw new Error("JWT_SECRET is not set");
  }
  return secret ?? "test-secret";
}

/**
 * Sign a short-lived HS256 session token.
 *
 * Requires `JWT_SECRET` to be set in non-test environments. Tests may set it
 * to any deterministic value; the library itself does not enforce strength.
 */
export function signToken(payload: TokenPayload): string {
  const secret = getSecret();
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
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
  iat: number;
  exp: number;
}

/**
 * Verify and decode a session token. Returns the payload on success, or `null`
 * if the token is expired, tampered, or malformed.
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const [encodedHeader, encodedPayload, signature] = token.split(".");

    if (!encodedHeader || !encodedPayload || !signature) {
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

    const decoded = JSON.parse(base64urlDecode(encodedPayload).toString("utf8")) as DecodedToken;

    if (decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      id: decoded.id,
      username: decoded.username,
    };
  } catch {
    return null;
  }
}
