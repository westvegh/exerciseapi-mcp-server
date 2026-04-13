import { describe, it, expect, vi } from "vitest";
import { LIST_CATEGORIES_DESCRIPTION } from "../../src/tools/list-categories.js";

vi.spyOn(process.stderr, "write").mockImplementation(() => true);

describe("list_categories tool", () => {
  it("description mentions categories", () => {
    expect(LIST_CATEGORIES_DESCRIPTION).toContain("exercise categories");
  });

  it("description mentions 12 categories", () => {
    expect(LIST_CATEGORIES_DESCRIPTION).toContain("12 categories");
  });
});
