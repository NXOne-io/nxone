/**
 * Login links and sessions.
 *
 * There are no passwords, so there is no password database to leak. A login is a one-time token
 * sent by email: we store only its hash, it expires quickly, and using it burns it. Sessions are
 * opaque ids in an httpOnly cookie, held server side, so signing out actually ends the session.
 */

const encoder = new TextEncoder();

/** Random, URL-safe, and long enough that guessing is not a strategy. */
export function randomToken(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return base64url(buf);
}

export function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Tokens are stored hashed, so a leaked database does not hand anyone a working login link. */
export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  return base64url(new Uint8Array(digest));
}

/** Compares without leaking where two strings first differ. */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const LOGIN_TOKEN_TTL_MS = 15 * 60 * 1000;
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface Session {
  userId: string;
  email: string;
  /** The organisation the session is currently acting in. */
  orgId?: string;
  createdAt: number;
  expiresAt: number;
}

export const sessionCookie = (token: string, secure: boolean) =>
  `nxone_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}${secure ? "; Secure" : ""}`;

export const clearedCookie = (secure: boolean) =>
  `nxone_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;

export function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return undefined;
}

/** Normalised so that Asha@Example.com and asha@example.com are the same person. */
export function normaliseEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isEmail(raw: string): boolean {
  const email = normaliseEmail(raw);
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254;
}
