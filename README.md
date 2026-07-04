# Dynamic Tool Registry Platform

**Turn any API into an AI tool — no code, no restarts.**

A central catalog and [Model Context Protocol (MCP)](https://modelcontextprotocol.io) registry where teams register REST APIs as governed, metadata-rich AI tools. Once registered and activated, a tool becomes instantly callable by any MCP-compatible AI client (Claude Desktop, MCP Inspector, Spring AI, IDE agents) — dynamically, at runtime, with **zero server restarts**.

---

## Why this exists — the problem it solves for organizations

As companies adopt AI assistants and agents, every team wants to expose *their* systems (orders, inventory, HR, support, internal APIs) to those agents. Without a platform, this means:

- **Scattered, hand-written MCP servers** — each team writes and redeploys code to expose a handful of endpoints. Slow, duplicated, hard to govern.
- **No central catalog** — nobody knows which tools exist, who owns them, or what they do.
- **LLM tool overload** — point an agent at 300 raw tools and its accuracy collapses; it can't pick the right one.
- **No guardrails** — dead endpoints, leaked API keys, no control over what gets exposed.

This platform fixes all four:

| Organizational need | How the platform delivers it |
|---|---|
| **Self-service onboarding** | Register an API through a UI form or by pasting a `curl` command — no engineering ticket, no redeploy. |
| **A single source of truth** | One searchable catalog of every tool: business purpose, owner, technical config, AI usage guidance. |
| **Scoped exposure per team/consumer** | Each Group gets its own MCP endpoint exposing *only* its tools — agents connect to a small, relevant set instead of the whole catalog. |
| **Governance & safety** | SSRF protection, secret masking, and an activation gate that blocks broken endpoints from ever reaching an AI client. |
| **Future-proofing** | A protocol-agnostic invoker design ready for GraphQL, gRPC, SOAP, Kafka and more — without re-architecting. |

**The outcome:** a business analyst can publish a working, AI-ready tool in minutes; an AI agent gets a curated, healthy, well-described toolset; and a platform owner keeps full visibility and control.

---

## Technology stack

100% open-source. No proprietary dependencies, no Spring Security, no WebFlux.

### Backend — `tool-registry-backend/`
| Concern | Technology |
|---|---|
| Language / runtime | **Java 21** |
| Framework | **Spring Boot 3.4** (Spring MVC, servlet stack) |
| AI / MCP | **Spring AI 1.0** + MCP Java SDK (`McpSyncServer`, SSE transport) |
| Persistence | **MongoDB** via Spring Data MongoDB |
| Mapping / boilerplate | **MapStruct**, **Lombok** |
| API docs | **springdoc-openapi** (Swagger UI) |
| Error format | **RFC 7807** `ProblemDetail` |

### Frontend — `tool-registry-frontend/`
| Concern | Technology |
|---|---|
| Framework | **React 18** + **TypeScript** + **Vite** |
| UI | **Material UI 6** (dark-first theme, light toggle) |
| Server state | **TanStack Query 5** |
| Tables | **TanStack Table 8** |
| Forms | **React Hook Form** + **Zod** |
| Code / JSON editing | **Monaco Editor** |
| Motion | **Framer Motion** |

### Delivery
Two **independent projects** (separate builds, Dockerfiles, READMEs). A root `docker-compose.yml` orchestrates `mongo + backend + frontend` for local use; nginx serves the frontend and proxies `/api`, `/sse` and `/mcp` to the backend.

---

## Architecture at a glance

```
                          ┌─────────────────────────────────────────┐
   AI Clients             │        Tool Registry Backend            │
   (Claude Desktop,       │                                         │
    MCP Inspector,        │   ┌──────────────┐   ┌──────────────┐   │
    Spring AI, IDEs)      │   │ Global MCP   │   │ Per-Group    │   │
        │                 │   │ server /sse  │   │ MCP servers  │   │
        │  MCP over SSE    │   │ (all tools)  │   │ /mcp/group/… │   │
        └─────────────────┼──▶└──────┬───────┘   └──────┬───────┘   │
                          │          │  runtime add/removeTool      │
                          │   ┌──────▼──────────────────▼───────┐   │
   Humans (Web UI) ───────┼──▶│  ToolService / GroupService     │   │
        REST /api/v1      │   │  (events → live MCP sync)       │   │
                          │   └──────┬──────────────────────────┘   │
                          │   ┌──────▼───────┐   ┌──────────────┐   │
                          │   │  MongoDB     │   │ ToolInvoker  │   │
                          │   │ tools/groups │   │  strategy →  │───┼──▶ External
                          │   └──────────────┘   │ HttpToolInvoker  │    APIs
                          │                       └──────────────┘   │
                          └─────────────────────────────────────────┘
```

**The core trick — no-restart registration:** tools live in MongoDB. When a tool is activated or changed, the service publishes an in-JVM event; a synchronizer calls `McpSyncServer.addTool()` / `removeTool()` on the running server, which automatically emits `notifications/tools/list_changed` to every connected AI client. Tools appear and disappear *live*, mid-session.

---

## Core concepts

- **Tool** — a registered API endpoint plus rich metadata: business purpose, category, tags, technical config (method, URL, headers, parameters, body template), documentation, examples, and an **AI Context** block (natural-language description, use cases, example prompts, keywords) that helps LLMs choose and call it correctly.
- **Group** — an organizational container (team, business area, domain). A tool can belong to **many** groups. Each group has its own scoped MCP endpoint.
- **Lifecycle** — `DRAFT → ACTIVE → DEPRECATED / DISABLED`. Only **ACTIVE** tools are exposed to AI clients. Activation is gated by a live connection test.
- **ToolType** — `HTTP` is implemented today; the model and invoker layer already reserve `GRAPHQL`, `SOAP`, `GRPC`, `KAFKA`, `DB_QUERY`, `JAVA_FUNCTION`, `REMOTE_MCP` for future protocols.

---

## Features — what each does and how it works

### 1. Metadata-driven tool registration (multi-step wizard)
A 6-step form (Basic → Technical → Parameters → Documentation → AI Context → Review) captures everything about an API. **How it works:** path/query/body parameters are defined declaratively; for `POST` tools a `{{param}}` body template is filled from caller arguments at invocation time. The rich AI Context is merged into the MCP tool description so models understand *when* and *how* to use the tool — not just its signature.

### 2. Quick registration from `curl`
Paste a `curl` command → the platform parses method, URL, headers, query string and JSON body into a full tool config, then registers it with the mandatory business details (tool name, display name, description). **How it works:** a shell-aware tokenizer + parser (`CurlCommandParser`) extracts flags, auto-detects and masks sensitive headers (Authorization, API keys, cookies), and derives typed `{{param}}` body parameters from flat JSON. A **Preview** step shows the parsed result before saving.

### 3. Dynamic MCP registry (zero-restart)
Activating a tool exposes it to AI clients immediately; deactivating removes it. **How it works:** Mongo is the source of truth; events drive live `addTool`/`removeTool` on the running `McpSyncServer`, and clients are notified via `tools/list_changed`. A `POST /mcp/refresh` escape hatch does a full resync.

### 4. Group-scoped MCP endpoints (solves LLM tool-overload)
Every group has a unique key and its own endpoint: `/mcp/group/{mcpKey}/sse`, exposing **only that group's ACTIVE tools**. **How it works:** one lightweight MCP server instance per group is created lazily on first connection; a single delegating router resolves the key per request (so runtime-created groups are reachable without restart). Keys are **regenerable** (rotating instantly invalidates the old URL). Give the "Orders" team a URL with 8 relevant tools instead of the whole 300-tool catalog — dramatically improving agent accuracy.

### 5. Multi-group membership + attach/detach
A tool can live in several groups; you can add existing catalog tools to a new group without recreating them. **How it works:** membership is an array on the tool; a diff-based synchronizer reconciles each change against every live group server — moving a tool between groups makes it vanish from one endpoint and appear on another, mid-session.

### 6. Activation gate (health-checked go-live)
A tool can only become **ACTIVE** after its endpoint passes a live connection test. **How it works:** `ToolService.changeStatus` runs the invoker's `testConnection()` before allowing the transition; an unreachable endpoint returns `409` with the failure reason and the tool stays in its current state. This protects AI consumers from ever seeing a dead tool.

### 7. Built-in testing sandbox (Postman-style)
Test any tool from the UI before or after activation. **How it works:** the Test Console auto-generates an argument form from the parameter definitions, executes the real call through the same invoker the AI uses, and shows resolved URL, sent request (secrets masked), status, timing and pretty-printed response. Plus one-click connection test and health check.

### 8. Search & discovery
Full-text search across the catalog (⌘K global search + filterable table). **How it works:** a **weighted MongoDB text index** ranks matches across tool name, display name, keywords, aliases, descriptions and business purpose, so the most relevant tools surface first.

### 9. Safety & governance
- **SSRF guard** (`SsrfGuard`) blocks calls to loopback, private, link-local and cloud-metadata addresses (configurable allowlist).
- **Secret masking** — sensitive header values are shown as `********` in every API response and execution echo, and preserved (never overwritten with the mask) on edit.
- **RFC 7807** structured errors everywhere.

### 10. Enterprise web console
Dashboard (stat cards, status breakdown, recent tools, live MCP status), tool catalog, tabbed tool detail (with copy-as-curl), groups management, MCP Registry page with ready-to-copy client config, dark/light theme, responsive layout.

---

## Quick start

### Run everything with Docker (recommended)
```bash
docker compose up --build
```
- Web console → http://localhost:3000
- API + Swagger UI → http://localhost:8080/swagger-ui.html
- Global MCP endpoint → `http://localhost:8080/sse`

### Run locally for development
```bash
# 1. MongoDB
docker run -d --name mongo -p 27017:27017 mongo:7

# 2. Backend  (http://localhost:8080)
cd tool-registry-backend && mvn spring-boot:run

# 3. Frontend (http://localhost:5173, proxies /api → 8080)
cd tool-registry-frontend && npm install && npm run dev
```

---

## Connecting an AI client

**All tools (global registry):**
```json
{
  "mcpServers": {
    "dynamic-tool-registry": { "url": "http://localhost:8080/sse" }
  }
}
```

**One team's tools only (group-scoped):**
```json
{
  "mcpServers": {
    "orders-team": { "url": "http://localhost:8080/mcp/group/<mcpKey>/sse" }
  }
}
```
The group's `mcpKey` and copy-ready snippet are shown on the group's detail page and the MCP Registry page.

**Verify from the CLI:**
```bash
npx @modelcontextprotocol/inspector --cli http://localhost:8080/sse \
  --transport sse --method tools/list
```

---

## API surface (`/api/v1`)

| Area | Endpoints |
|---|---|
| Groups | `POST/GET /groups`, `GET/PUT/DELETE /groups/{id}`, `GET /groups/{id}/tools`, `PUT/DELETE /groups/{id}/tools/{toolId}` (attach/detach), `POST /groups/{id}/regenerate-mcp-key` |
| Tools | `POST/GET /tools`, `GET/PUT/DELETE /tools/{id}`, `PATCH /tools/{id}/status`, `GET /tools/stats/status-counts` |
| Quick register | `POST /tools/parse-curl`, `POST /tools/quick-register` |
| Testing | `POST /tools/{id}/execute`, `POST /tools/{id}/test-connection`, `GET /tools/{id}/health` |
| MCP | `GET /mcp/status`, `GET /mcp/tools`, `GET /mcp/tools/search?q=`, `POST /mcp/refresh`, `GET /mcp/groups/{groupId}/tools` |
| MCP transport | `GET /sse` (global), `GET /mcp/group/{mcpKey}/sse` (per group) |

Full interactive docs at **`/swagger-ui.html`**.

---

## Project layout

```
dynamic-registry/
├── docker-compose.yml          # local orchestration: mongo + backend + frontend
├── tool-registry-backend/      # Spring Boot 3.4 · Java 21 · MongoDB · Spring AI (MCP)
│   └── README.md               # backend-specific docs
└── tool-registry-frontend/     # React 18 · TypeScript · Vite · Material UI
    └── README.md               # frontend-specific docs
```

---

## Design decisions & extensibility

- **`ToolInvoker` strategy pattern** is the extension seam: `HttpToolInvoker` is the first implementation. A new protocol = one new invoker class + one config subdocument, no refactoring.
- **Single `tools` collection** with a `toolType` discriminator gives uniform search/listing across all future protocols with no migration.
- **Direct `McpSyncServer` mutation** (not Spring AI's snapshot-at-startup provider list) is what enables true no-restart registration.
- **In-JVM events** drive Mongo→MCP sync for the single-instance deployment; `POST /mcp/refresh` covers manual resync, and MongoDB change streams are the documented path to multi-instance.
- **Reserved AI embedding fields** on every tool mean semantic/vector search can be added later with zero schema migration.

---

*Built as a production-grade reference platform. 100% open-source components.*
