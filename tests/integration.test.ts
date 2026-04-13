import { describe, it, expect } from "vitest";
import { ExerciseApiClient } from "../src/client.js";

const apiKey = process.env.EXERCISEAPI_KEY;

describe.skipIf(!apiKey)("integration tests (real API)", () => {
  const client = new ExerciseApiClient(apiKey!);

  it("searchExercises returns exercises for 'bench press'", async () => {
    const result = await client.searchExercises(
      { query: "bench press", limit: 5 },
      "search_exercises",
    );
    expect(result.isError).toBeUndefined();
    const body = JSON.parse(result.content[0].text);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0]).toHaveProperty("id");
    expect(body.data[0]).toHaveProperty("name");
  }, 10000);

  it("getExercise returns details for a valid ID", async () => {
    // First get a valid ID from search
    const searchResult = await client.searchExercises(
      { query: "bench press", limit: 1 },
      "search_exercises",
    );
    const searchBody = JSON.parse(searchResult.content[0].text);
    const id = searchBody.data[0].id;

    const result = await client.getExercise(id, "get_exercise");
    expect(result.isError).toBeUndefined();
    const body = JSON.parse(result.content[0].text);
    expect(body.data).toHaveProperty("id", id);
    expect(body.data).toHaveProperty("name");
  }, 10000);

  it("listCategories returns 12 categories", async () => {
    const result = await client.listCategories("list_categories");
    expect(result.isError).toBeUndefined();
    const body = JSON.parse(result.content[0].text);
    expect(body.data).toHaveLength(12);
    expect(body.data[0]).toHaveProperty("category");
  }, 10000);

  it("listMuscles returns grouped muscles", async () => {
    const result = await client.listMuscles("list_muscles");
    expect(result.isError).toBeUndefined();
    const body = JSON.parse(result.content[0].text);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0]).toHaveProperty("displayGroup");
    expect(body.data[0]).toHaveProperty("muscles");
  }, 10000);

  it("listEquipment returns equipment list", async () => {
    const result = await client.listEquipment("list_equipment");
    expect(result.isError).toBeUndefined();
    const body = JSON.parse(result.content[0].text);
    expect(body.data.length).toBeGreaterThan(0);
  }, 10000);

  it("getStats returns totalExercises > 0", async () => {
    const result = await client.getStats("get_stats");
    expect(result.isError).toBeUndefined();
    const body = JSON.parse(result.content[0].text);
    expect(body.data.totalExercises).toBeGreaterThan(0);
  }, 10000);
});
