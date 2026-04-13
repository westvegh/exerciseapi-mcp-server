import type { SearchParams, ToolResult } from "./types.js";
import { mapRestErrorToToolError, makeNetworkError } from "./errors.js";

const VERSION = "1.0.0";

export class ExerciseApiClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = "https://api.exerciseapi.dev") {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  private headers(toolName: string): Record<string, string> {
    return {
      "X-API-Key": this.apiKey,
      "User-Agent": `exerciseapi-mcp-server/${VERSION} (tool:${toolName})`,
      Accept: "application/json",
    };
  }

  private async request(
    path: string,
    toolName: string,
    context?: { exerciseId?: string },
  ): Promise<ToolResult> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        headers: this.headers(toolName),
      });
    } catch {
      return makeNetworkError();
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      if (response.ok) {
        process.stderr.write(
          `WARN: Non-JSON response from exerciseapi.dev for ${path}\n`,
        );
        return {
          content: [
            {
              type: "text",
              text: "Unexpected response from exerciseapi.dev. This may indicate an API version mismatch.",
            },
          ],
          isError: true,
        };
      }
      return mapRestErrorToToolError(response.status, null, context);
    }

    if (!response.ok) {
      return mapRestErrorToToolError(response.status, body, context);
    }

    // Validate that successful responses contain a `data` key
    if (typeof body !== "object" || body === null || !("data" in body)) {
      return mapRestErrorToToolError(response.status, body, context);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(body) }],
    };
  }

  async searchExercises(
    params: SearchParams,
    toolName: string,
  ): Promise<ToolResult> {
    const searchParams = new URLSearchParams();
    if (params.query) searchParams.set("q", params.query);
    if (params.category) searchParams.set("category", params.category);
    if (params.muscle) searchParams.set("muscle", params.muscle);
    if (params.equipment) searchParams.set("equipment", params.equipment);
    if (params.difficulty) searchParams.set("level", params.difficulty);
    if (params.limit) searchParams.set("limit", String(params.limit));

    const qs = searchParams.toString();
    return this.request(`/v1/exercises${qs ? `?${qs}` : ""}`, toolName);
  }

  async getExercise(id: string, toolName: string): Promise<ToolResult> {
    return this.request(`/v1/exercises/${encodeURIComponent(id)}`, toolName, {
      exerciseId: id,
    });
  }

  async listCategories(toolName: string): Promise<ToolResult> {
    return this.request("/v1/categories", toolName);
  }

  async listMuscles(toolName: string): Promise<ToolResult> {
    return this.request("/v1/muscles", toolName);
  }

  async listEquipment(toolName: string): Promise<ToolResult> {
    return this.request("/v1/equipment", toolName);
  }

  async getStats(toolName: string): Promise<ToolResult> {
    return this.request("/v1/stats", toolName);
  }

  async validateKey(): Promise<{ valid: boolean; error?: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    try {
      const response = await fetch(`${this.baseUrl}/v1/stats`, {
        headers: this.headers("startup_validation"),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.status === 401) {
        return { valid: false, error: "invalid" };
      }
      return { valid: true };
    } catch {
      clearTimeout(timeout);
      process.stderr.write(
        "WARN: Could not validate API key at startup (network error or timeout). Continuing anyway.\n",
      );
      return { valid: true };
    }
  }
}
