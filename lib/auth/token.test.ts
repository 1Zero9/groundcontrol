import { beforeAll, describe, expect, it } from "vitest";
import { createSignedToken, verifySignedToken } from "./token";

interface TestPayload {
  userId: string;
  exp: number;
}

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-do-not-use-in-production";
});

describe("createSignedToken / verifySignedToken", () => {
  it("round-trips a payload", () => {
    const token = createSignedToken<TestPayload>({ userId: "abc123" }, 60);
    const payload = verifySignedToken<TestPayload>(token);
    expect(payload?.userId).toBe("abc123");
  });

  it("rejects a tampered payload", () => {
    const token = createSignedToken<TestPayload>({ userId: "abc123" }, 60);
    const [, signature] = token.split(".");
    const tamperedBody = Buffer.from(
      JSON.stringify({ userId: "attacker", exp: Date.now() + 60000 })
    ).toString("base64url");
    const tampered = `${tamperedBody}.${signature}`;
    expect(verifySignedToken<TestPayload>(tampered)).toBeNull();
  });

  it("rejects a tampered signature", () => {
    const token = createSignedToken<TestPayload>({ userId: "abc123" }, 60);
    const [body] = token.split(".");
    expect(verifySignedToken<TestPayload>(`${body}.not-a-real-signature`)).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = createSignedToken<TestPayload>({ userId: "abc123" }, -1);
    expect(verifySignedToken<TestPayload>(token)).toBeNull();
  });

  it("returns null for undefined/empty/malformed input", () => {
    expect(verifySignedToken<TestPayload>(undefined)).toBeNull();
    expect(verifySignedToken<TestPayload>("")).toBeNull();
    expect(verifySignedToken<TestPayload>("no-dot-here")).toBeNull();
  });
});
