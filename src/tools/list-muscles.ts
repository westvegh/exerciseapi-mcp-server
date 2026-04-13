import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ExerciseApiClient } from "../client.js";
import type { TtlCache } from "../cache.js";
import type { ToolResult } from "../types.js";

export const LIST_MUSCLES_DESCRIPTION = `List all anatomical muscles that can be used as filters in search_exercises. Use this when the user asks "what muscles can I target?" or when you need to validate a muscle name before filtering. Returns muscles grouped by display group (e.g., "chest" → ["pectoralis major", "pectoralis minor"]).`;

export function registerListMuscles(
  server: McpServer,
  client: ExerciseApiClient,
  cache: TtlCache,
): void {
  server.tool(
    "list_muscles",
    LIST_MUSCLES_DESCRIPTION,
    async () => {
      const cacheKey = "list_muscles";
      const cached = cache.get<ToolResult>(cacheKey);
      if (cached) return cached;

      const result = await client.listMuscles("list_muscles");
      if (!result.isError) {
        cache.set(cacheKey, result);
        return result;
      }

      const stale = cache.getStale<ToolResult>(cacheKey);
      if (stale) {
        process.stderr.write(
          "WARN: list_muscles refresh failed, serving stale cache\n",
        );
        return stale;
      }

      return result;
    },
  );
}
