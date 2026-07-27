/** Public admin shape — never includes passwordHash. */
export interface Admin {
  id: string;
  username: string;
  failedLoginAttempts: number;
  lockUntil: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
}

/** Internal admin shape used by the data-access layer — includes passwordHash. */
export interface AdminInternal extends Admin {
  passwordHash: string;
}