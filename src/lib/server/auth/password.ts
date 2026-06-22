import { hash, verify } from "@node-rs/argon2";

const HASH_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

export async function hashPassword(password: string): Promise<string> {
  return hash(password, HASH_OPTIONS);
}

export async function verifyPassword(hashValue: string, password: string): Promise<boolean> {
  try {
    return await verify(hashValue, password, HASH_OPTIONS);
  } catch {
    return false;
  }
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (password.length < 8) errors.push("Password must be at least 8 characters long");
  if (password.length > 128) errors.push("Password must be less than 128 characters");
  if (!/[a-z]/.test(password)) errors.push("Password must contain at least one lowercase letter");
  if (!/[A-Z]/.test(password)) errors.push("Password must contain at least one uppercase letter");
  if (!/[0-9]/.test(password)) errors.push("Password must contain at least one number");
  return { valid: errors.length === 0, errors };
}

export function validateUsername(username: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (username.length < 3) errors.push("Username must be at least 3 characters long");
  if (username.length > 32) errors.push("Username must be less than 32 characters");
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    errors.push("Username can only contain letters, numbers, underscores, and hyphens");
  }
  return { valid: errors.length === 0, errors };
}
