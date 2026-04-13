import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ExerciseApiClient } from "../client.js";
import type { TtlCache } from "../cache.js";
import type { ToolResult } from "../types.js";

export const LIST_CATEGORIES_DESCRIPTION = `List all available exercise categories with counts. Use this to show the user what types of exercises are available, or to help them pick a category to filter by. Returns 12 categories spanning strength training, mobility, rehab, and group fitness disciplines.`;

export function registerListCategories(
  server: McpServer,
  client: ExerciseApiClient,
  cache: TtlCache,
): void {
  server.tool(
    "list_categories",
    LIST_CATEGORIES_DESCRIPTION,
    async () => {
      const cacheKey = "list_categories";
      const cached = cache.get<ToolResult>(cacheKey);
      if (cached) return cached;

      const result = await client.listCategories("list_categories");
      if (!result.isError) {
        cache.set(cacheKey, result);
        return result;
      }

      const stale = cache.getStale<ToolResult>(cacheKey);
      if (stale) {
        process.stderr.write(
          "WARN: list_categories refresh failed, serving stale cache\n",
        );
        return stale;
      }

      return result;
    },
  );
}
