import { describe, it, expect, vi, beforeEach } from "vitest";
import { mapRestErrorToToolError, makeNetworkError } from "../src/errors.js";

beforeEach(() => {
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

describe("mapRestErrorToToolError", () => {
  it("returns malformed-200 error when 200 response has no data key", () => {
    const result = mapRestErrorToToolError(200, { something: "else" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Unexpected response");
  });

  it("maps 400 with message and hint", () => {
    const body = {
      error: {
        code: "INVALID_PARAMETER",
        message: "Invalid category",
        hint: "Use list_categories to see valid values",
      },
    };
    const result = mapRestErrorToToolError(400, body);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe(
      "Invalid category. Use list_categories to see valid values",
    );
  });

  it("maps 400 with message only (no hint)", () => {
    const body = {
      error: { code: "INVALID_PARAMETER", message: "Invalid parameter" },
    };
    const result = mapRestErrorToToolError(400, body);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Invalid parameter");
  });

  it("maps 401 to invalid API key message", () => {
    const result = mapRestErrorToToolError(401, {
      error: { code: "INVALID_API_KEY", message: "Invalid API key" },
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("API key is invalid");
    expect(result.content[0].text).toContain(
      "https://exerciseapi.dev/dashboard",
    );
  });

  it("maps 404 with exercise ID from context", () => {
    const result = mapRestErrorToToolError(
      404,
      { error: { code: "NOT_FOUND", message: "Not found" } },
      { exerciseId: "Nonexistent_Exercise" },
    );
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Nonexistent_Exercise");
    expect(result.content[0].text).toContain("search_exercises");
  });

  it("maps 429 RATE_LIMIT_EXCEEDED with details", () => {
    const body = {
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Daily quota reached",
        details: {
          current_tier: "free",
          limit: 100,
          resets_at: "2026-04-13T00:00:00Z",
        },
      },
    };
    const result = mapRestErrorToToolError(429, body);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Daily quota reached");
    expect(result.content[0].text).toContain("free");
    expect(result.content[0].text).toContain("100");
    expect(result.content[0].text).toContain("2026-04-13");
  });

  it("maps 429 OVERAGE_CAP_EXCEEDED", () => {
    const body = {
      error: {
        code: "OVERAGE_CAP_EXCEEDED",
        message: "Overage cap exceeded",
        details: { current_tier: "starter", resets_at: "2026-04-13T00:00:00Z" },
      },
    };
    const result = mapRestErrorToToolError(429, body);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Overage cap exceeded");
  });

  it("maps 5xx to temporarily unavailable", () => {
    const result = mapRestErrorToToolError(500, { error: "internal" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("temporarily unavailable");
  });

  it("maps 503 to temporarily unavailable", () => {
    const result = mapRestErrorToToolError(503, null);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("temporarily unavailable");
  });
});

describe("makeNetworkError", () => {
  it("returns a network error tool result", () => {
    const result = makeNetworkError();
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Could not reach");
  });
});
