export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    hint?: string;
    docs_url?: string;
    details?: Record<string, unknown>;
  };
}

export interface SearchParams {
  query?: string;
  category?: string;
  muscle?: string;
  equipment?: string;
  difficulty?: string;
  limit?: number;
}

export interface ToolResult {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}
