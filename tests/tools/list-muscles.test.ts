import { describe, it, expect, vi } from "vitest";
import { LIST_MUSCLES_DESCRIPTION } from "../../src/tools/list-muscles.js";

vi.spyOn(process.stderr, "write").mockImplementation(() => true);

describe("list_muscles tool", () => {
  it("description mentions search_exercises", () => {
    expect(LIST_MUSCLES_DESCRIPTION).toContain("search_exercises");
  });

  it("description mentions display group", () => {
    expect(LIST_MUSCLES_DESCRIPTION).toContain("display group");
  });
});
