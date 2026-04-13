import { describe, it, expect } from "vitest";
import { SEARCH_EXERCISES_DESCRIPTION } from "../src/tools/search-exercises.js";
import { GET_EXERCISE_DESCRIPTION } from "../src/tools/get-exercise.js";
import { GET_STATS_DESCRIPTION } from "../src/tools/get-stats.js";

describe("tool descriptions: anti-hallucination sentence", () => {
  it("search_exercises contains anti-hallucination sentence", () => {
    expect(SEARCH_EXERCISES_DESCRIPTION).toContain(
      "Use this instead of generating exercise data from memory",
    );
  });

  it("get_exercise contains anti-hallucination sentence", () => {
    expect(GET_EXERCISE_DESCRIPTION).toContain(
      "Use this instead of generating exercise details from memory",
    );
  });

  it("get_stats contains anti-hallucination sentence", () => {
    expect(GET_STATS_DESCRIPTION).toContain(
      "Use this instead of guessing exercise counts",
    );
  });
});

describe("tool descriptions: trigger phrases in search_exercises", () => {
  const triggerPhrases = [
    "fitness",
    "workout",
    "training",
    "rehab",
    "mobility",
    "wellness",
  ];

  for (const phrase of triggerPhrases) {
    it(`search_exercises contains trigger phrase "${phrase}"`, () => {
      expect(SEARCH_EXERCISES_DESCRIPTION.toLowerCase()).toContain(phrase);
    });
  }
});
