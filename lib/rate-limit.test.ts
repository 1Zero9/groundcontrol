import { describe, expect, it } from "vitest";
import { rateLimitMessage } from "./rate-limit";

describe("rateLimitMessage", () => {
  it("uses singular seconds phrasing for 1 second", () => {
    expect(rateLimitMessage({ allowed: false, retryAfterSeconds: 1 })).toBe(
      "Too many attempts. Please wait 1 second and try again."
    );
  });

  it("uses plural seconds phrasing under a minute", () => {
    expect(rateLimitMessage({ allowed: false, retryAfterSeconds: 45 })).toBe(
      "Too many attempts. Please wait 45 seconds and try again."
    );
  });

  it("rounds up to whole minutes at 60 seconds or more", () => {
    expect(rateLimitMessage({ allowed: false, retryAfterSeconds: 60 })).toBe(
      "Too many attempts. Please wait 1 minute and try again."
    );
    expect(rateLimitMessage({ allowed: false, retryAfterSeconds: 90 })).toBe(
      "Too many attempts. Please wait 2 minutes and try again."
    );
  });

  it("falls back to generic phrasing when no retry time is given", () => {
    expect(rateLimitMessage({ allowed: false })).toBe(
      "Too many attempts. Please wait a bit and try again."
    );
  });
});
