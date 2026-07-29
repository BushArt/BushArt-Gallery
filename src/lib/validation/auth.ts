import { z } from "zod";

/**
 * Schema for POST /api/auth/login request body.
 */
export const LoginRequestSchema = z.object({
  username: z.string().min(1, "username is required").max(100, "username must be <= 100 chars"),
  password: z.string().min(1, "password is required").max(256, "password must be <= 256 chars"),
});

/**
 * Schema for the authenticated profile returned by GET /api/auth/me.
 */
export const AdminProfileSchema = z.object({
  id: z.string(),
  username: z.string(),
});

/**
 * Schema for the unauthenticated response from GET /api/auth/me.
 */
export const UnauthenticatedResponseSchema = z.object({
  authenticated: z.literal(false),
});

/**
 * Union type for GET /api/auth/me response.
 */
export const AuthMeResponseSchema = z.union([
  AdminProfileSchema,
  UnauthenticatedResponseSchema,
]);

export const ErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).default({}),
  }),
});

export const AuthErrorEnvelopeSchema = ErrorEnvelopeSchema;

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type AdminProfile = z.infer<typeof AdminProfileSchema>;
export type AuthMeResponse = z.infer<typeof AuthMeResponseSchema>;
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;
