import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ExerciseApiClient } from "../src/client.js";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("ExerciseApiClient", () => {
  const client = new ExerciseApiClient("test-key", "https://api.example.com");

  describe("headers", () => {
    it("sends X-API-Key and User-Agent on every request", async () => {
      mockFetch.mockResolvedValue(jsonResponse({ data: [] }));
      await client.listCategories("list_categories");

      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers["X-API-Key"]).toBe("test-key");
      expect(init.headers["User-Agent"]).toMatch(
        /^exerciseapi-mcp-server\/[\d.]+ \(tool:list_categories\)$/,
      );
    });

    it("includes tool name in User-Agent", async () => {
      mockFetch.mockResolvedValue(jsonResponse({ data: {} }));
      await client.getStats("get_stats");

      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers["User-Agent"]).toContain("tool:get_stats");
    });
  });

  describe("searchExercises", () => {
    it("maps query to ?q= parameter", async () => {
      mockFetch.mockResolvedValue(
        jsonResponse({ data: [], total: 0, limit: 20, offset: 0 }),
      );
      await client.searchExercises(
        { query: "bench press" },
        "search_exercises",
      );

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain("?q=bench+press");
    });

    it("maps difficulty to ?level= parameter", async () => {
      mockFetch.mockResolvedValue(
        jsonResponse({ data: [], total: 0, limit: 20, offset: 0 }),
      );
      await client.searchExercises(
        { difficulty: "beginner" },
        "search_exercises",
      );

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain("level=beginner");
      expect(url).not.toContain("difficulty=");
    });

    it("passes category, muscle, equipment, limit as-is", async () => {
      mockFetch.mockResolvedValue(
        jsonResponse({ data: [], total: 0, limit: 10, offset: 0 }),
      );
      await client.searchExercises(
        { category: "strength", muscle: "chest", equipment: "barbell", limit: 10 },
        "search_exercises",
      );

      const url: string = mockFetch.mock.calls[0][0];
      expect(url).toContain("category=strength");
      expect(url).toContain("muscle=chest");
      expect(url).toContain("equipment=barbell");
      expect(url).toContain("limit=10");
    });

    it("returns success result with JSON body", async () => {
      const body = { data: [{ id: "Test" }], total: 1, limit: 20, offset: 0 };
      mockFetch.mockResolvedValue(jsonResponse(body));
      const result = await client.searchExercises({}, "search_exercises");

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text)).toEqual(body);
    });
  });

  describe("getExercise", () => {
    it("encodes the exercise ID in the URL path", async () => {
      mockFetch.mockResolvedValue(
        jsonResponse({ data: { id: "Barbell_Bench_Press" } }),
      );
      await client.getExercise("Barbell_Bench_Press", "get_exercise");

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain("/v1/exercises/Barbell_Bench_Press");
    });

    it("returns 404 error with exercise ID", async () => {
      mockFetch.mockResolvedValue(
        jsonResponse(
          { error: { code: "NOT_FOUND", message: "Not found" } },
          404,
        ),
      );
      const result = await client.getExercise(
        "Nonexistent_Exercise",
        "get_exercise",
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Nonexistent_Exercise");
    });
  });

  describe("error handling", () => {
    it("returns network error on fetch failure", async () => {
      mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));
      const result = await client.listCategories("list_categories");

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Could not reach");
    });

    it("returns malformed-200 error when response has no data key", async () => {
      mockFetch.mockResolvedValue(jsonResponse({ something: "else" }));
      const result = await client.listCategories("list_categories");

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Unexpected response");
    });

    it("maps 401 to invalid key error", async () => {
      mockFetch.mockResolvedValue(
        jsonResponse(
          { error: { code: "INVALID_API_KEY", message: "Unauthorized" } },
          401,
        ),
      );
      const result = await client.getStats("get_stats");

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("API key is invalid");
    });

    it("maps 500 to temporarily unavailable", async () => {
      mockFetch.mockResolvedValue(
        jsonResponse({ error: "internal error" }, 500),
      );
      const result = await client.getStats("get_stats");

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("temporarily unavailable");
    });
  });

  describe("validateKey", () => {
    it("returns valid on 200", async () => {
      mockFetch.mockResolvedValue(jsonResponse({ data: {} }));
      const result = await client.validateKey();
      expect(result.valid).toBe(true);
    });

    it("returns invalid on 401", async () => {
      mockFetch.mockResolvedValue(jsonResponse({}, 401));
      const result = await client.validateKey();
      expect(result.valid).toBe(false);
      expect(result.error).toBe("invalid");
    });

    it("returns valid with warning on network error", async () => {
      mockFetch.mockRejectedValue(new Error("timeout"));
      const result = await client.validateKey();
      expect(result.valid).toBe(true);
    });
  });
});
