import bcrypt from "bcryptjs";

export const DUMMY_PASSWORD_HASH =
  "$2a$12$Z5k0XnSZjnJCJPjPWwuRl.7QHbztV/2OzGNWQ.zsYHNw9hMrW/yaC";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
