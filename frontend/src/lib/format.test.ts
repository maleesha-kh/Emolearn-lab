import { describe, expect, it } from "vitest";
import { formatShortDate } from "./format";

// vitest.config.ts runs the tests in UTC

describe("formatShortDate", () => {
  it("formats a known date as short month and day", () => {
    expect(formatShortDate("2026-03-14T10:00:00Z")).toBe("Mar 14");
  });

  it("handles the year boundary", () => {
    expect(formatShortDate("2025-12-31T23:59:59Z")).toBe("Dec 31");
    expect(formatShortDate("2026-01-01T00:00:00Z")).toBe("Jan 1");
  });

  it("uses the local timezone, not the one in the timestamp", () => {
    // Already 1 Jan in Sri Lanka, still 31 Dec in UTC
    expect(formatShortDate("2026-01-01T02:00:00+05:30")).toBe("Dec 31");
  });
});
