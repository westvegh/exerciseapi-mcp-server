import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ExerciseApiClient } from "../client.js";

export const GET_EXERCISE_DESCRIPTION = `Fetch the complete details for a single exercise by ID. Use this when the user wants the full instructions, form tips, safety notes, anatomical muscle list, variations, and demonstration video for a specific exercise and you already have the ID (e.g., from a previous search_exercises call or from the user). Returns the full exercise object. Use this instead of generating exercise details from memory — LLMs cannot reliably reproduce exercise instructions, anatomical muscle targeting, or safety information.`;

export function registerGetExercise(
  server: McpServer,
  client: ExerciseApiClient,
): void {
  server.tool(
    "get_exercise",
    GET_EXERCISE_DESCRIPTION,
    {
      id: z
        .string()
        .describe(
          "The exercise ID, returned by search_exercises (e.g., 'Barbell_Bench_Press'). Uses Capitalized_Snake_Case.",
        ),
    },
    async (args) => {
      return client.getExercise(args.id, "get_exercise");
    },
  );
}
