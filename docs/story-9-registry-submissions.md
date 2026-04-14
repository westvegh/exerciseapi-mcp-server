# Story 9 Spec: MCP Registry Submissions

> **Status**: Draft — checklist for manual submissions
> **Parent**: MCP_spec_final.md §6.3, Story 9
> **Depends on**: `@exerciseapi/mcp-server@1.0.0` published on npm (done)
> **Repo**: No code changes — all external submissions

---

## 1. Context

`@exerciseapi/mcp-server@1.0.0` is live on npm. To maximize discoverability, the server needs to be listed in the major MCP registries and directories. Each submission is a form, CLI command, or PR — no code changes to our repos.

**Package details for all submissions:**
- **Name**: `@exerciseapi/mcp-server`
- **npm**: https://www.npmjs.com/package/@exerciseapi/mcp-server
- **GitHub**: https://github.com/westvegh/exerciseapi-mcp-server
- **Description**: Official MCP server for exerciseapi.dev — give your AI coding agent direct access to 2,198+ vetted exercises across 12 categories.
- **Install**: `npx -y @exerciseapi/mcp-server`
- **Auth**: `EXERCISEAPI_KEY` env var
- **Tools**: search_exercises, get_exercise, list_categories, list_muscles, list_equipment, get_stats
- **License**: MIT
- **Transport**: stdio
- **Node**: >= 18

---

## 2. Submissions (priority order)

### 2.1 Official MCP Registry (registry.modelcontextprotocol.io)

**Priority**: Highest — this is the official registry that MCP clients query.

**Process**:
1. Install the `mcp-publisher` CLI: clone `github.com/modelcontextprotocol/registry`, run `make publisher`
2. In the `exerciseapi-mcp-server` repo, run `mcp-publisher init` to generate a `server.json`
3. Add `mcpName` to `package.json` — must match GitHub namespace format: `io.github.westvegh/exerciseapi-mcp-server`
4. Authenticate: `mcp-publisher login github` (opens browser for GitHub OAuth)
5. Dry run: `mcp-publisher publish --dry-run` to validate
6. Publish: `mcp-publisher publish`

**Docs**: https://github.com/modelcontextprotocol/registry/blob/main/docs/guides/publishing/publish-server.md

**Gotcha**: The registry only hosts metadata — the actual package must already be on npm (it is). The `mcpName` property needs to be added to our `package.json` before publishing.

---

### 2.2 mcp.so

**Priority**: High — largest community directory (19,700+ servers), high search visibility.

**Process**: Submit via GitHub issue at the mcp.so repository.
1. Go to https://github.com/punkpeye/awesome-mcp-servers (this is the repo behind mcp.so)
2. Open a new issue using the "Submit MCP Server" template
3. Fill in: name, description, npm link, GitHub link, category (API integration / data)

**Alternative**: Submit at https://mcp.so — there may be a submit button in the nav bar.

---

### 2.3 Smithery (smithery.ai)

**Priority**: Medium — supports config templates, good for discovery.

**Process**: 
1. Create a `smithery.yaml` in the repo root (config template for the server)
2. Run `smithery mcp publish <url> -n exerciseapi/mcp-server`

**Alternative**: Submit through the Smithery web interface at smithery.ai.

**Config template** (smithery.yaml):
```yaml
name: exerciseapi-mcp-server
description: Official MCP server for exerciseapi.dev — search 2,198+ exercises across 12 categories
parameters:
  - name: EXERCISEAPI_KEY
    description: Your API key from exerciseapi.dev/dashboard
    required: true
    secret: true
command: npx
args:
  - -y
  - "@exerciseapi/mcp-server"
```

---

### 2.4 Cursor Marketplace (cursor.com/marketplace)

**Priority**: Medium — Cursor-specific, but large user base.

**Process**: Cursor launched a marketplace at cursor.com/marketplace in Feb 2026 with one-click MCP installs. Check for a "Submit" or "Add Server" flow on the marketplace page. May also accept submissions via the `github.com/cursor/mcp-servers` repo as a PR.

---

### 2.5 awesome-mcp-servers (mcpservers.org)

**Priority**: Low — curated list, good for SEO and backlinks.

**Process**: Submit at https://mcpservers.org/submit (the repo does not accept PRs directly).

**Category**: API Integration / Health & Fitness

---

### 2.6 Additional directories (optional)

These weren't in the original spec but have emerged as relevant:
- **PulseMCP** (pulsemcp.com/servers) — 12,520+ servers, updated daily
- **mcp.directory** — another community directory
- **cursor.directory** — community Cursor configs

---

## 3. Checklist

| # | Registry | Action | Status |
|---|----------|--------|--------|
| 1 | Official MCP Registry | `mcp-publisher publish` | [ ] |
| 2 | mcp.so | GitHub issue or web submit | [ ] |
| 3 | Smithery | `smithery mcp publish` or web | [ ] |
| 4 | Cursor Marketplace | Web submit or PR | [ ] |
| 5 | mcpservers.org | Web submit | [ ] |

---

## 4. Package.json change needed

Before submitting to the official MCP registry, add `mcpName` to `exerciseapi-mcp-server/package.json`:

```json
"mcpName": "io.github.westvegh/exerciseapi-mcp-server"
```

This is the only code change required for Story 9.

---

## 5. Acceptance criteria

- [ ] Listed on registry.modelcontextprotocol.io
- [ ] Listed on mcp.so
- [ ] Listed on smithery.ai
- [ ] Submitted to Cursor marketplace
- [ ] Submitted to mcpservers.org
- [ ] `mcpName` added to package.json and committed
