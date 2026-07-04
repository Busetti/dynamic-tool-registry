# Tool Registry Backend

Production-grade backend for the **Dynamic Tool Registry Platform** — a central AI Tool Catalog and MCP Registry. Register APIs as AI tools with rich business and technical metadata; they are exposed to MCP-compatible clients dynamically, with **no restart required**.

## Stack

Java 21 · Spring Boot 3.4 (MVC) · Spring AI 1.0 (MCP server, SSE) · Spring Data MongoDB · MapStruct · Lombok · springdoc-openapi

## Architecture

```
api/              REST controllers, DTOs, MapStruct mappers, RFC 7807 error handling
application/      Use-case services (GroupService, ToolService, ToolTestingService) + domain events
domain/           Tool & Group aggregates, protocol config subdocuments, invocation results
infrastructure/
  persistence/    Spring Data repositories + programmatic index management
  invoker/        ToolInvoker strategy (the protocol extension seam) — HTTP is the first impl
  config/         CORS, OpenAPI, RestClient
mcp/              ToolDefinitionFactory, McpToolRegistry, McpRegistrySynchronizer
```

**Key design points**

- **`ToolInvoker` strategy** keyed by `ToolType` — adding GraphQL/gRPC/Kafka later = one new class + one config subdocument. No refactoring.
- **No-restart MCP sync**: `ToolService` publishes `ToolChangedEvent` after every save; `McpRegistrySynchronizer` pushes changes to the live `McpSyncServer` (`addTool`/`removeTool`), which notifies connected clients via `tools/list_changed`.
- **Single `tools` collection** with a `toolType` discriminator, weighted text index for search, and reserved `aiContext.embedding` fields so vector search can be added without migration.
- **SSRF guard** blocks loopback/private/metadata targets (configurable trusted hosts); sensitive header values are masked in every API response and execution echo.

## Run locally

```bash
docker run -d --name mongo -p 27017:27017 mongo:7
mvn spring-boot:run
```

- Swagger UI: http://localhost:8080/swagger-ui.html
- MCP endpoint (SSE): http://localhost:8080/sse

## Connect an MCP client

```json
{
  "mcpServers": {
    "dynamic-tool-registry": { "url": "http://localhost:8080/sse" }
  }
}
```

Verify with the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector --cli http://localhost:8080/sse --transport sse --method tools/list
```

## Configuration

| Property | Default | Purpose |
|---|---|---|
| `MONGODB_URI` | `mongodb://localhost:27017/toolregistry` | MongoDB connection |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Frontend origins |
| `SSRF_GUARD_ENABLED` | `true` | Toggle SSRF protection |
| `SSRF_TRUSTED_HOSTS` | `localhost,127.0.0.1,host.docker.internal` | Hosts exempt from SSRF checks |

## API surface (`/api/v1`)

- `POST/GET /groups`, `GET/PUT/DELETE /groups/{id}`, `GET /groups/{id}/tools`
- `POST/GET /tools`, `GET/PUT/DELETE /tools/{id}`, `PATCH /tools/{id}/status`, `GET /tools/stats/status-counts`
- `POST /tools/{id}/execute`, `POST /tools/{id}/test-connection`, `GET /tools/{id}/health`
- `GET /mcp/status`, `GET /mcp/tools`, `GET /mcp/tools/search?q=`, `POST /mcp/refresh`, `GET /mcp/groups/{groupId}/tools`
