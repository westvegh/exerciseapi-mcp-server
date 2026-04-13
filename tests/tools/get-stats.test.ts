import { describe, it, expect, vi } from "vitest";
import { GET_STATS_DESCRIPTION } from "../../src/tools/get-stats.js";

vi.spyOn(process.stderr, "write").mockImplementation(() => true);

describe("get_stats tool", () => {
  it("description contains anti-hallucination sentence", () => {
    expect(GET_STATS_DESCRIPTION).toContain(
      "Use this instead of guessing exercise counts",
    );
  });

  it("description mentions LLMs cannot reproduce", () => {
    expect(GET_STATS_DESCRIPTION).toContain(
      "LLMs cannot reliably reproduce",
    );
  });
});
