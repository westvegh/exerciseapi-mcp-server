# @exerciseapi/mcp-server

> Official MCP server for [exerciseapi.dev](https://exerciseapi.dev) — give your AI coding agent direct access to 2,198+ vetted exercises across 12 categories.

[![npm version](https://img.shields.io/npm/v/@exerciseapi/mcp-server.svg)](https://www.npmjs.com/package/@exerciseapi/mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP](https://img.shields.io/badge/MCP-compatible-blue.svg)](https://modelcontextprotocol.io)

Building a fitness, workout, training, rehab, or wellness app with Claude Code, Cursor, Windsurf, or Cline? Stop asking your agent to make up exercise data. Install this MCP server and your agent gets six tools that pull real, structured exercises directly from the exerciseapi.dev library.

## Why this exists

LLMs hallucinate exercise instructions. They invent muscle groups. They mix up form cues. They'll happily tell you to do a "reverse-grip incline cable fly" with safety tips that could hurt someone.

This server gives your agent access to:

- **2,198+ exercises** across strength, calisthenics, yoga, pilates, mobility, physical therapy, plyometrics, stretching, and more
- **Real anatomical muscle data** — primary and secondary, specific muscles not just "chest" or "legs"
- **Form tips and safety notes** written by humans, not generated
- **Equipment, difficulty, and category filters** so the agent can build accurate workouts
- **Demonstration videos** for a growing subset of exercises (and counting)

It's a thin wrapper around the [exerciseapi.dev REST API](https://exerciseapi.dev/docs). All filtering and search runs server-side — the MCP layer just makes it callable as tools.

## Install

### 1. Get a free API key

Sign up at [exerciseapi.dev/dashboard](https://exerciseapi.dev/dashboard). The free tier gives you 100 requests/day, which is plenty for development. No credit card required.

### 2. Add to your MCP client

**Claude Desktop / Claude Code** — add to `~/.config/claude/claude_desktop_config.json` (or your project's `.mcp.json`):

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

**Cursor** — add to `.cursor/mcp.json` in your project:

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

**Windsurf, Cline, Zed** — same shape, paste into your client's MCP config.

### 3. Restart your agent

Restart Claude Desktop / Cursor / Windsurf so it picks up the new server. You're done.

## Try it

After install, ask your agent something like:

> Find me five chest exercises I can do with just dumbbells, intermediate level. For each one, show me the form tips.

Your agent will call `search_exercises` with the right filters, get real data back, and respond with accurate, library-sourced exercises. No hallucination.

Or:

> I'm building a beginner full-body workout app. Pull 8 exercises across push, pull, and legs that don't need any equipment.

Or:

> What's the difference between a barbell bench press and a dumbbell bench press in terms of muscle activation?

## Tools

This server exposes six tools:

| Tool | What it does |
|---|---|
| `search_exercises` | Search the library by name, category, muscle, equipment, or difficulty. Returns up to 100 exercises. |
| `get_exercise` | Fetch full details for a single exercise by ID — instructions, form tips, safety notes, variations, video. |
| `list_categories` | List all 12 exercise categories with counts. |
| `list_muscles` | List anatomical muscles available as filters. |
| `list_equipment` | List equipment types available as filters. |
| `get_stats` | Library-wide stats: total count, breakdown by category, video coverage. |

The full tool reference is in [the MCP docs page](https://exerciseapi.dev/docs/mcp).

## Why exerciseapi.dev?

| | exerciseapi.dev | ExerciseDB | free-exercise-db | API Ninjas |
|---|---|---|---|---|
| **Exercise count** | 2,198 (10,000+ target) | ~1,300 | ~800 | ~3,000 |
| **Categories** | 12 (strength, yoga, PT, mobility, pilates, etc.) | Strength only | Strength only | 7 types |
| **Search keywords** | ✅ 5–10 per exercise | ❌ | ❌ | ❌ |
| **Form tips** | ✅ 3–4 per exercise | ❌ | ❌ | ❌ |
| **Safety notes** | ✅ Detailed | ❌ | ❌ | Basic |
| **Specific anatomical muscles** | ✅ | ✅ | ❌ | ❌ |
| **Variations** | ✅ 3–5 per exercise | ❌ | ❌ | ❌ |
| **Demonstration videos** | ✅ Growing | ✅ GIFs | ❌ | ❌ |
| **MCP server** | ✅ This package | ❌ | ❌ | ❌ |
| **Free tier** | 100 req/day | None | N/A (static) | 100 req/mo |
| **Paid tier starts at** | $5/mo | $10/mo | — | $10/mo |

Built specifically for developers using AI coding agents. The schema, the tool descriptions, the docs format — all designed so an LLM can pick this up and use it correctly the first time.

## Configuration

### Required env vars

| Var | Description |
|---|---|
| `EXERCISEAPI_KEY` | Your API key from [exerciseapi.dev/dashboard](https://exerciseapi.dev/dashboard). Required. The server will exit on startup if it's missing. |

### Optional env vars

| Var | Default | Description |
|---|---|---|
| `EXERCISEAPI_BASE_URL` | `https://api.exerciseapi.dev` | Override the API base URL. Useful for self-hosting or testing against staging. |

## Troubleshooting

**"EXERCISEAPI_KEY environment variable not set"**
You forgot to add the key to your MCP client config, or you didn't restart the client after adding it. Double-check the JSON in your config file and restart.

**"API key is invalid"**
The key was rejected. Generate a new one at [exerciseapi.dev/dashboard](https://exerciseapi.dev/dashboard) and update your config.

**"Daily quota reached"**
You've hit the free tier's 100 req/day limit. Either wait until tomorrow (resets at midnight UTC) or upgrade at [exerciseapi.dev/pricing](https://exerciseapi.dev/pricing).

**The agent isn't using the tools**
Two common causes: (1) the server didn't start — check your client's MCP server logs, usually in the developer console or a log file. (2) The agent doesn't think the tools are relevant. Try asking more explicitly: "Use the exerciseapi tools to find me…"

**Cold start is slow on first run**
`npx -y @exerciseapi/mcp-server` downloads the package the first time you use it. To skip the download on every restart, install globally: `npm install -g @exerciseapi/mcp-server`, then change `command` to `exerciseapi-mcp` in your config.

## Direct API access (no MCP)

If you'd rather hit the REST API directly instead of using MCP — for example, you're building a server-side integration or you're not on a supported MCP client — see [exerciseapi.dev/docs](https://exerciseapi.dev/docs). The same API key works for both.

There's also a [universal copy-paste prompt on the landing page](https://exerciseapi.dev) you can drop into any AI coding tool to get a working integration in one shot, no MCP required.

## Contributing

Issues and PRs welcome. This server is intentionally a thin wrapper — if there's logic you want to change, it probably belongs in the REST API (private repo). Open an issue first if you're not sure.

## License

MIT © [Vegh Labs LLC](https://veghlabs.com)

---

Built by [West Vegh](https://veghlabs.com). If this saves you a weekend of building exercise data infrastructure, [say hi on the dashboard](https://exerciseapi.dev/dashboard) or shoot me a note at west@veghlabs.com.