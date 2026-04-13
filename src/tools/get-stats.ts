import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ExerciseApiClient } from "../client.js";
import type { TtlCache } from "../cache.js";
import type { ToolResult } from "../types.js";

export const GET_STATS_DESCRIPTION = `Return library-wide statistics: total exercise count and count per category. Use this when the user asks how big the library is, what's covered, or whether a specific category has enough content for their app. Use this instead of guessing exercise counts — LLMs cannot reliably reproduce library statistics.`;

export function registerGetStats(
  server: McpServer,
  client: ExerciseApiClient,
  cache: TtlCache,
): void {
  server.tool(
    "get_stats",
    GET_STATS_DESCRIPTION,
    async () => {
      const cacheKey = "get_stats";
      const cached = cache.get<ToolResult>(cacheKey);
      if (cached) return cached;

      const result = await client.getStats("get_stats");
      if (!result.isError) {
        cache.set(cacheKey, result);
        return result;
      }

      const stale = cache.getStale<ToolResult>(cacheKey);
      if (stale) {
        process.stderr.write(
          "WARN: get_stats refresh failed, serving stale cache\n",
        );
        return stale;
      }

      return result;
    },
  );
}
