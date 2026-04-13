import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ExerciseApiClient } from "./client.js";
import { registerSearchExercises } from "./tools/search-exercises.js";
import { registerGetExercise } from "./tools/get-exercise.js";
import { registerListCategories } from "./tools/list-categories.js";
import { registerListMuscles } from "./tools/list-muscles.js";
import { registerListEquipment } from "./tools/list-equipment.js";
import { registerGetStats } from "./tools/get-stats.js";
import { TtlCache } from "./cache.js";

// 1. Validate EXERCISEAPI_KEY
const apiKey = process.env.EXERCISEAPI_KEY;
if (!apiKey) {
  process.stderr.write(
    `ERROR: EXERCISEAPI_KEY environment variable not set.\nGet a free API key at https://exerciseapi.dev/dashboard\nThen add EXERCISEAPI_KEY to your MCP client config. See: https://exerciseapi.dev/docs/mcp\n`,
  );
  process.exit(1);
}

const baseUrl =
  process.env.EXERCISEAPI_BASE_URL || "https://api.exerciseapi.dev";
const client = new ExerciseApiClient(apiKey, baseUrl);

// 2. Validate key at startup
const validation = await client.validateKey();
if (!validation.valid && validation.error === "invalid") {
  process.stderr.write(
    `ERROR: EXERCISEAPI_KEY is invalid. Generate a new key at https://exerciseapi.dev/dashboard\n`,
  );
  process.exit(1);
}

// 3. Create server and register tools
const server = new McpServer({
  name: "exerciseapi-mcp-server",
  version: "1.0.0",
});

const cache = new TtlCache();

registerSearchExercises(server, client);
registerGetExercise(server, client);
registerListCategories(server, client, cache);
registerListMuscles(server, client, cache);
registerListEquipment(server, client, cache);
registerGetStats(server, client, cache);

// 4. Connect
const transport = new StdioServerTransport();
await server.connect(transport);
