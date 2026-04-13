import type { ApiErrorBody, ToolResult } from "./types.js";

function isApiErrorBody(body: unknown): body is ApiErrorBody {
  return (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof (body as ApiErrorBody).error === "object" &&
    (body as ApiErrorBody).error !== null &&
    typeof (body as ApiErrorBody).error.message === "string"
  );
}

export function mapRestErrorToToolError(
  status: number,
  body: unknown,
  context?: { exerciseId?: string },
): ToolResult {
  // Malformed 200 — no `data` key
  if (status >= 200 && status < 300) {
    process.stderr.write(
      `WARN: Malformed 200 response from exerciseapi.dev: ${JSON.stringify(body)}\n`,
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

  if (status === 400 && isApiErrorBody(body)) {
    const msg = body.error.hint
      ? `${body.error.message}. ${body.error.hint}`
      : body.error.message;
    return { content: [{ type: "text", text: msg }], isError: true };
  }

  if (status === 401) {
    return {
      content: [
        {
          type: "text",
          text: "API key is invalid. Generate a new key at https://exerciseapi.dev/dashboard, update EXERCISEAPI_KEY in your MCP client config, and restart the MCP server.",
        },
      ],
      isError: true,
    };
  }

  if (status === 404) {
    const id = context?.exerciseId ?? "unknown";
    return {
      content: [
        {
          type: "text",
          text: `Exercise not found: ${id}. Use search_exercises to find a valid ID.`,
        },
      ],
      isError: true,
    };
  }

  if (status === 429 && isApiErrorBody(body)) {
    const details = body.error.details;
    const parts = [body.error.message];
    if (details) {
      if (details.current_tier) parts.push(`Tier: ${details.current_tier}`);
      if (details.limit) parts.push(`Limit: ${details.limit}`);
      if (details.resets_at) parts.push(`Resets at: ${details.resets_at}`);
    }
    return {
      content: [{ type: "text", text: parts.join(". ") }],
      isError: true,
    };
  }

  if (status >= 500) {
    process.stderr.write(
      `ERROR: exerciseapi.dev returned ${status}: ${JSON.stringify(body)}\n`,
    );
    return {
      content: [
        {
          type: "text",
          text: "exerciseapi.dev is temporarily unavailable. Try again in a moment.",
        },
      ],
      isError: true,
    };
  }

  // Fallback for unhandled status codes
  return {
    content: [
      {
        type: "text",
        text: `Unexpected error from exerciseapi.dev (HTTP ${status}).`,
      },
    ],
    isError: true,
  };
}

export function makeNetworkError(): ToolResult {
  return {
    content: [
      {
        type: "text",
        text: "Could not reach exerciseapi.dev. Check your internet connection.",
      },
    ],
    isError: true,
  };
}
