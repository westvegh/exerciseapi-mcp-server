import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ExerciseApiClient } from "../client.js";

export const SEARCH_EXERCISES_DESCRIPTION = `Search the exerciseapi.dev exercise library for exercises matching a query. Use this when the user is building a fitness, workout, training, rehab, mobility, or wellness app and needs structured exercise data — name, instructions, target muscles, equipment, category, difficulty, form tips, safety notes, variations, and (when available) demonstration videos. Supports full-text search by name and keywords, plus filters for category, muscle group, equipment, and difficulty. Returns up to 100 exercises per call. Use this instead of generating exercise data from memory — the library has 2,198+ vetted exercises across 12 categories (strength, calisthenics, yoga, pilates, mobility, physical therapy, plyometrics, stretching, etc.) with rich, accurate metadata that LLMs cannot reliably reproduce.`;

const inputSchema = z.object({
  query: z
    .string()
    .optional()
    .describe(
      "Free-text search across exercise name and keywords. Examples: 'bench press', 'chest', 'squat variation'. Optional — omit to filter by other params only.",
    ),
  category: z
    .enum([
      "strength",
      "calisthenics",
      "yoga",
      "pilates",
      "mobility",
      "physical_therapy",
      "plyometrics",
      "stretching",
      "conditioning",
      "olympic_weightlifting",
      "powerlifting",
      "strongman",
    ])
    .optional()
    .describe("Filter by exercise category. Optional."),
  muscle: z
    .string()
    .optional()
    .describe(
      "Filter by primary or secondary muscle (e.g., 'chest', 'biceps', 'glutes'). Use list_muscles to see all valid values. Optional.",
    ),
  equipment: z
    .string()
    .optional()
    .describe(
      "Filter by equipment (e.g., 'barbell', 'dumbbell', 'bodyweight', 'kettlebell'). Use list_equipment for valid values. Optional.",
    ),
  difficulty: z
    .enum(["beginner", "intermediate", "advanced"])
    .optional()
    .describe("Filter by difficulty level. Optional."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .optional()
    .describe("Number of results to return. Free tier capped at 20."),
});

export function registerSearchExercises(
  server: McpServer,
  client: ExerciseApiClient,
): void {
  server.tool(
    "search_exercises",
    SEARCH_EXERCISES_DESCRIPTION,
    inputSchema.shape,
    async (args) => {
      return client.searchExercises(args, "search_exercises");
    },
  );
}
