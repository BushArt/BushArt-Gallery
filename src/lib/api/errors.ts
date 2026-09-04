import { NextResponse } from "next/server";
import { error as logError } from "@/lib/logger";

type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "LOCKED"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE";

export function apiError(
  status: number,
  code: ErrorCode,
  message: string,
  details: Record<string, unknown> = {},
): NextResponse {
  return NextResponse.json(
    { error: { code, message, details } },
    { status, headers: { "Content-Type": "application/json" } },
  );
}

const MONGO_UNAVAILABLE_NAMES = new Set([
  "MongoNetworkError",
  "MongoNetworkTimeoutError",
  "MongoServerSelectionError",
  "MongoTimeoutError",
]);

function isMongoUnavailableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (MONGO_UNAVAILABLE_NAMES.has(error.name)) return true;

  const code = (error as Error & { code?: unknown }).code;
  return typeof code === "number" && [6, 50, 89, 91].includes(code);
}

export function handleRouteError(error: unknown, logLabel: string): NextResponse {
  if (error instanceof Response) {
    return error as NextResponse;
  }

  logError(logLabel, { error });
  if (isMongoUnavailableError(error)) {
    return apiError(503, "SERVICE_UNAVAILABLE", "Database temporarily unavailable");
  }
  return apiError(500, "INTERNAL_ERROR", "An unexpected error occurred");
}

export const OBJECT_ID_REGEX = /^[a-f0-9]{24}$/;
