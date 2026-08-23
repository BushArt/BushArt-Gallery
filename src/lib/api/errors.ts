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

export function handleRouteError(error: unknown, logLabel: string): NextResponse {
  if (error instanceof Response) {
    return error as NextResponse;
  }

  logError(logLabel, { error });
  return apiError(500, "INTERNAL_ERROR", "An unexpected error occurred");
}

export const OBJECT_ID_REGEX = /^[a-f0-9]{24}$/;
