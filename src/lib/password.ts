import bcrypt from "bcryptjs";

const ROUNDS = 10; // bcryptjs is pure JS — keep signup snappy; fine for sandbox demo auth.

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string | null): boolean {
  if (!hash) return false;
  try {
    return bcrypt.compareSync(plain, hash);
  } catch {
    return false;
  }
}
