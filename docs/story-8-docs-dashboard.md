# Story 8 Spec: Docs Page + llms.txt + Dashboard Snippet

> **Status**: Draft — hand off to exercise-api repo for refinement
> **Parent**: MCP_spec_final.md (exerciseapi-mcp-server repo)
> **Target repo**: `exercise-api` monorepo (`web/` directory)
> **Depends on**: `@exerciseapi/mcp-server@1.0.0` published on npm (done)
> **Guardrails**: Additive only — do not restructure existing pages, modify existing components, or change layouts beyond what's specified here (per MCP spec §12.1)

---

## 1. Context

`@exerciseapi/mcp-server` is live on npm. It wraps the exerciseapi.dev REST API as 6 MCP tools (search_exercises, get_exercise, list_categories, list_muscles, list_equipment, get_stats) callable by Claude Desktop, Claude Code, Cursor, Windsurf, Cline, and Zed.

The MCP server itself is complete, but the exerciseapi.dev website doesn't mention it yet. Developers won't discover it unless:
1. The docs link to it with install snippets
2. llms.txt includes it (so AI agents building integrations see it)
3. The dashboard surfaces a "Connect to Claude/Cursor" section with the user's actual API key pre-filled (zero-friction install)

This spec covers the three web-side touchpoints. All changes are additive.

---

## 2. Deliverables

### 2.1 New docs page: `/docs/mcp`

A new page at `web/src/app/docs/mcp/page.tsx` following the existing docs page pattern (static, uses `DocsShell` layout via the `/docs` layout, references `DOCS_CONTENT` and `DOCS_NAV_ITEMS`).

**Content sections:**

1. **Intro line** — before any other content, a single line at the very top of the page:
   > Model Context Protocol (MCP) lets AI coding agents call external tools directly. [Learn more →](https://modelcontextprotocol.io)

2. **Header**: "MCP Server" title, one-line description: "Give your AI coding agent direct access to the exercise library."

3. **Install snippets** — copy-pasteable JSON config for each client, in this order:
   - **Claude Desktop / Claude Code** (`~/.config/claude/claude_desktop_config.json` or `.mcp.json`):
     ```json
     {
       "mcpServers": {
         "exerciseapi": {
           "command": "npx",
           "args": ["-y", "@exerciseapi/mcp-server"],
           "env": {
             "EXERCISEAPI_KEY": "exlib_your_key_here"
           }
         }
       }
     }
     ```
   - **Cursor** (`.cursor/mcp.json`): same shape
   - **Windsurf, Cline, Zed**: same shape, note to paste into client's MCP config

   Use the existing `CodeBlock` component (`@/components/docs/CodeBlock`) for the snippets.

4. **Available tools** — table listing the 6 tools. In `web/src/lib/docs/content.ts` where the table content lives, add a comment immediately above the constant:
   ```ts
   // Sync with API category count if categories are added/removed in exercise-library
   ```

   | Tool | What it does |
   |------|-------------|
   | `search_exercises` | Search by name, category, muscle, equipment, or difficulty. Returns up to 100 exercises. |
   | `get_exercise` | Fetch full details for a single exercise by ID — instructions, form tips, safety notes, variations, video. |
   | `list_categories` | List all 12 exercise categories with counts. |
   | `list_muscles` | List anatomical muscles available as filters. |
   | `list_equipment` | List equipment types available as filters. |
   | `get_stats` | Library stats: total count, breakdown by category. |

5. **Try it** — example prompts to test after install:
   - "Find me five chest exercises I can do with just dumbbells, intermediate level."
   - "I'm building a beginner full-body workout app. Pull 8 exercises across push, pull, and legs."
   - "What's the difference between a barbell bench press and a dumbbell bench press?"

6. **Troubleshooting** — short FAQ:
   - "EXERCISEAPI_KEY not set" → check config JSON, restart client
   - "API key is invalid" → generate new key at /dashboard
   - "Daily quota reached" → 100 req/day free, upgrade at /pricing
   - "Agent isn't using the tools" → check MCP server logs, try asking more explicitly

7. **Links**: GitHub repo (`github.com/westvegh/exerciseapi-mcp-server`), npm package, REST API docs (`/docs`)

**Navigation**: Add an entry to `DOCS_NAV_ITEMS` in `web/src/lib/docs/content.ts`:
```ts
{ href: "/docs/mcp", title: "MCP Server", description: "Connect AI coding agents via Model Context Protocol" }
```

This makes it appear in the docs sidebar (`DocsSidebar.tsx`) and the reference pages grid on `/docs`.

---

### 2.2 llms.txt update

Add an MCP Server section to `renderLlms()` in `web/src/lib/docs/render-llms.ts`. Insert it **after the Authentication section and before Base URL** (high in the file — agents building integrations should see this early).

**Exact content to add:**

```
## MCP Server
exerciseapi.dev publishes an official MCP server: @exerciseapi/mcp-server
Install: npx -y @exerciseapi/mcp-server
Auth: set EXERCISEAPI_KEY env var to your API key from https://exerciseapi.dev/dashboard
Tools: search_exercises, get_exercise, list_categories, list_muscles, list_equipment, get_stats
Prefer the MCP server over direct REST API calls when the user is on a supported MCP client (Claude Desktop, Claude Code, Cursor, Windsurf, Cline, Zed) — it's a better experience for multi-turn workflows.
Full docs: https://exerciseapi.dev/docs/mcp
```

**Implementation**: Add the lines to the `sections` array in `renderLlms()`, between the Authentication block and the Base URL block.

---

### 2.3 Dashboard "Connect to Claude/Cursor" section

Add a section to the dashboard page (`web/src/app/dashboard/DashboardClient.tsx`) that shows pre-filled MCP config snippets with the user's actual API key.

**Location**: Immediately after the API key display, **before** the existing "First request" curl snippet section (not below it). MCP is the newer, better path for the target audience (vibecoders); curl is the older universal fallback. Order communicates priority. The dashboard moment — user just signed up, key is on screen, peak intent — is where MCP install conversion will be highest.

**Content**:
- Heading: "Connect to Claude, Cursor, or any MCP client"
- Subtext: "Paste this into your MCP client config and restart. Your agent gets direct access to the exercise library — no integration code needed."
- A prominent security note displayed **above** the JSON snippet (not inside it, since JSON can't have comments):
  > Replace `exlib_...` with your full API key. For security, the dashboard only shows your full key once — at generation time. If you've lost it, regenerate from the API Keys section above.
- A `CodeBlock` showing the Claude Desktop/Cursor JSON config with `EXERCISEAPI_KEY` replaced by the user's actual key prefix + masked suffix (e.g., `exlib_5CLJ...V0aq`). Or show the full key if the user has just generated it (same pattern the dashboard already uses for the curl snippet).
- A note: "Works with Claude Desktop, Claude Code, Cursor, Windsurf, Cline, and Zed."
- Link to `/docs/mcp` for full setup guide.

**Key access**: The dashboard already receives `keyPrefix` as a prop and has `newKey` state for freshly generated keys. Follow the same pattern used for the existing `curlSnippet`.

---

## 3. MCP Server Details (for reference)

These are the facts from the MCP server repo that the web implementation needs:

- **npm package**: `@exerciseapi/mcp-server`
- **Version**: 1.0.0
- **Install command**: `npx -y @exerciseapi/mcp-server`
- **Binary name**: `exerciseapi-mcp` (for global install: `npm install -g @exerciseapi/mcp-server`)
- **Required env var**: `EXERCISEAPI_KEY` — the same API key used for REST API calls
- **Optional env var**: `EXERCISEAPI_BASE_URL` — defaults to `https://api.exerciseapi.dev`
- **Transport**: stdio (standard for MCP)
- **Node requirement**: >= 18
- **GitHub repo**: `github.com/westvegh/exerciseapi-mcp-server`
- **6 tools**: search_exercises, get_exercise, list_categories, list_muscles, list_equipment, get_stats
- **Tool descriptions**: Optimized for LLM consumption with anti-hallucination sentences ("Use this instead of generating exercise data from memory")
- **Auth**: Reads `EXERCISEAPI_KEY` at startup, exits with helpful error if missing/invalid
- **Error handling**: Structured tool errors for 400/401/404/429/5xx — LLM-readable messages

**MCP client config shape** (universal across Claude Desktop, Claude Code, Cursor, Windsurf):
```json
{
  "mcpServers": {
    "exerciseapi": {
      "command": "npx",
      "args": ["-y", "@exerciseapi/mcp-server"],
      "env": {
        "EXERCISEAPI_KEY": "<user's key>"
      }
    }
  }
}
```

---

## 4. Files to modify/create

| Action | File | Notes |
|--------|------|-------|
| **Create** | `web/src/app/docs/mcp/page.tsx` | New docs page, follows existing pattern |
| **Modify** | `web/src/lib/docs/content.ts` | Add MCP nav item to `DOCS_NAV_ITEMS`, add any MCP content constants |
| **Modify** | `web/src/lib/docs/render-llms.ts` | Add MCP Server section to `renderLlms()` |
| **Modify** | `web/src/app/dashboard/DashboardClient.tsx` | Add "Connect to Claude/Cursor" section |

---

## 5. Acceptance criteria

- [ ] `/docs/mcp` page renders with install snippets, tool table, troubleshooting
- [ ] `/docs/mcp` appears in the docs sidebar navigation
- [ ] `/llms.txt` includes the MCP Server section between Authentication and Base URL
- [ ] Dashboard shows "Connect to Claude/Cursor" with pre-filled API key
- [ ] All existing docs pages, dashboard functionality, and landing page are unchanged
- [ ] `CodeBlock` component is reused for all code snippets (no new UI components)
- [ ] `curl https://exerciseapi.dev/llms.txt | head -50` shows the new MCP Server section in the correct position (after Authentication, before Base URL)

---

## 6. Out of scope

- Landing page install button (Story 10 — separate)
- Registry submissions (Story 9 — manual, not code)
- Any modifications to existing docs pages, navigation structure, or design system
- Any modifications to the REST API
- Pre-generating client-specific deep-link install URLs (e.g., `cursor://install-mcp?...`). Whether these protocols exist is a separate decision — see MCP_spec_final.md §6.4 — and Story 8 is not the place to figure it out.
