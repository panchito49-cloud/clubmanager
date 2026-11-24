import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";

/**
 * Hash de contrasenas con scrypt (incluido en Node, sin dependencias nativas).
 * Formato: scrypt$N$r$p$saltBase64$hashBase64
 */
const PARAMS = { N: 16384, r: 8, p: 1, keylen: 64 };

type ScryptOptions = { N: number; r: number; p: number; maxmem: number };

function scryptAsync(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, options, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password.normalize("NFKC"), salt, PARAMS.keylen, {
    N: PARAMS.N,
    r: PARAMS.r,
    p: PARAMS.p,
    maxmem: 64 * 1024 * 1024,
  });

  return [
    "scrypt",
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = Buffer.from(parts[4], "base64");
  const expected = Buffer.from(parts[5], "base64");

  const actual = await scryptAsync(password.normalize("NFKC"), salt, expected.length, {
    N,
    r,
    p,
    maxmem: 64 * 1024 * 1024,
  });

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Token aleatorio de 256 bits para sesiones y restablecimientos. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export function randomPassword(length = 12): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}
