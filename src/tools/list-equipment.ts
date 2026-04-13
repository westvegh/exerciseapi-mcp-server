import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ExerciseApiClient } from "../client.js";
import type { TtlCache } from "../cache.js";
import type { ToolResult } from "../types.js";

export const LIST_EQUIPMENT_DESCRIPTION = `List all equipment types valid as filters in search_exercises. Use this when the user wants to know what's available for a specific piece of equipment they have, or to validate an equipment name before filtering.`;

export function registerListEquipment(
  server: McpServer,
  client: ExerciseApiClient,
  cache: TtlCache,
): void {
  server.tool(
    "list_equipment",
    LIST_EQUIPMENT_DESCRIPTION,
    async () => {
      const cacheKey = "list_equipment";
      const cached = cache.get<ToolResult>(cacheKey);
      if (cached) return cached;

      const result = await client.listEquipment("list_equipment");
      if (!result.isError) {
        cache.set(cacheKey, result);
        return result;
      }

      const stale = cache.getStale<ToolResult>(cacheKey);
      if (stale) {
        process.stderr.write(
          "WARN: list_equipment refresh failed, serving stale cache\n",
        );
        return stale;
      }

      return result;
    },
  );
}
