import { describe, expect, it } from "vitest";
import { constantTimeEqual, hashToken, isEmail, normaliseEmail, randomToken, readCookie, sessionCookie } from "@/auth/tokens";

describe("login tokens", () => {
  it("makes tokens that are long, url safe and never repeat", async () => {
    const a = randomToken();
    const b = randomToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(40);
    expect(a).toMatch(/^[\w-]+$/);
  });
  it("stores only a hash, so a leaked table is not a set of working links", async () => {
    const token = randomToken();
    const hash = await hashToken(token);
    expect(hash).not.toContain(token);
    expect(await hashToken(token)).toBe(hash);
    expect(await hashToken(randomToken())).not.toBe(hash);
  });
  it("compares without leaking where two strings differ", () => {
    expect(constantTimeEqual("abc", "abc")).toBe(true);
    expect(constantTimeEqual("abc", "abd")).toBe(false);
    expect(constantTimeEqual("abc", "abcd")).toBe(false);
  });
});

describe("email handling", () => {
  it("treats the same address written differently as one person", () => {
    expect(normaliseEmail("  Asha@Example.COM ")).toBe("asha@example.com");
  });
  it("accepts real addresses and rejects the rest", () => {
    expect(isEmail("asha@example.com")).toBe(true);
    expect(isEmail("asha@example")).toBe(false);
    expect(isEmail("not an email")).toBe(false);
    expect(isEmail(`${"a".repeat(250)}@example.com`)).toBe(false);
  });
});

describe("session cookie", () => {
  it("is httpOnly and same-site, and secure in production", () => {
    const c = sessionCookie("abc", true);
    expect(c).toContain("HttpOnly");
    expect(c).toContain("SameSite=Lax");
    expect(c).toContain("Secure");
    expect(sessionCookie("abc", false)).not.toContain("Secure");
  });
  it("reads itself back out of a cookie header", () => {
    expect(readCookie("other=1; nxone_session=abc123; x=2", "nxone_session")).toBe("abc123");
    expect(readCookie(null, "nxone_session")).toBeUndefined();
  });
});
