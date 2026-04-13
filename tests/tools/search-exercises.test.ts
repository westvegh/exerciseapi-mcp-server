import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  SEARCH_EXERCISES_DESCRIPTION,
  registerSearchExercises,
} from "../../src/tools/search-exercises.js";
import { ExerciseApiClient } from "../../src/client.js";

vi.spyOn(process.stderr, "write").mockImplementation(() => true);

describe("search_exercises tool", () => {
  let server: McpServer;
  let client: ExerciseApiClient;

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: [],
            total: 0,
            limit: 20,
            offset: 0,
          }),
          { status: 200 },
        ),
      ),
    );
    server = new McpServer({ name: "test", version: "0.0.0" });
    client = new ExerciseApiClient("test-key", "https://api.example.com");
    registerSearchExercises(server, client);
  });

  it("registers with the correct description", () => {
    expect(SEARCH_EXERCISES_DESCRIPTION).toContain(
      "Search the exerciseapi.dev exercise library",
    );
  });

  it("description contains anti-hallucination sentence", () => {
    expect(SEARCH_EXERCISES_DESCRIPTION).toContain(
      "Use this instead of generating exercise data from memory",
    );
  });

  it("description contains trigger phrases", () => {
    for (const phrase of [
      "fitness",
      "workout",
      "training",
      "rehab",
      "mobility",
      "wellness",
    ]) {
      expect(SEARCH_EXERCISES_DESCRIPTION.toLowerCase()).toContain(phrase);
    }
  });
});
