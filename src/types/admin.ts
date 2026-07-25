/** Public admin shape — never includes passwordHash. */
export interface Admin {
  id: string;
  username: string;
  failedLoginAttempts: number;
  lockUntil: Date | null;
  lastLoginAt: Date | null;
  createdAt: string;
}
