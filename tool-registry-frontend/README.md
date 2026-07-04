# Tool Registry Frontend

Enterprise React UI for the **Dynamic Tool Registry Platform** — inspired by Postman, Grafana, GitHub and Backstage.

## Stack

React 18 · TypeScript · Vite · Material UI 6 · TanStack Query 5 · TanStack Table 8 · React Hook Form + Zod · Monaco Editor · Framer Motion · React Router 6

## Features

- **Dashboard** — stat cards, status breakdown, recent tools, live MCP status
- **Tool catalog** — filterable/searchable table with full-text search backed by MongoDB's weighted text index
- **6-step registration wizard** — Basic → Technical → Parameters → Documentation → AI Context → Review, with Monaco editors for JSON payloads and unlimited dynamic header/parameter rows
- **Tool detail** — tabbed view (Overview / Technical / Documentation / AI Context / Examples), status lifecycle actions, copy-as-curl
- **Test console** — Postman-style split view: auto-generated argument form + full request/response echo with pretty JSON, connection test and health check
- **Groups** — card grid, detail pages with member tools, markdown documentation
- **MCP Registry** — live registered tools with generated schemas, client connection snippet, force resync
- **Global search** (⌘K), dark/light mode, responsive layout, snackbar notifications

## Development

```bash
npm install
npm run dev        # http://localhost:5173 — proxies /api to localhost:8080
```

The backend (`tool-registry-backend`) must be running on port 8080.

## Production build

```bash
npm run build      # typecheck + bundle to dist/
```

The Docker image serves the bundle via nginx and proxies `/api`, `/sse` and `/mcp/message` to the backend service.
