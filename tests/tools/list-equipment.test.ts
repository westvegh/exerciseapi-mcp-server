import { describe, it, expect, vi } from "vitest";
import { LIST_EQUIPMENT_DESCRIPTION } from "../../src/tools/list-equipment.js";

vi.spyOn(process.stderr, "write").mockImplementation(() => true);

describe("list_equipment tool", () => {
  it("description mentions search_exercises", () => {
    expect(LIST_EQUIPMENT_DESCRIPTION).toContain("search_exercises");
  });

  it("description mentions equipment", () => {
    expect(LIST_EQUIPMENT_DESCRIPTION).toContain("equipment");
  });
});
