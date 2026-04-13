import { describe, it, expect, vi } from "vitest";
import { GET_EXERCISE_DESCRIPTION } from "../../src/tools/get-exercise.js";

vi.spyOn(process.stderr, "write").mockImplementation(() => true);

describe("get_exercise tool", () => {
  it("description contains anti-hallucination sentence", () => {
    expect(GET_EXERCISE_DESCRIPTION).toContain(
      "Use this instead of generating exercise details from memory",
    );
  });

  it("description mentions LLMs cannot reproduce", () => {
    expect(GET_EXERCISE_DESCRIPTION).toContain(
      "LLMs cannot reliably reproduce",
    );
  });
});
