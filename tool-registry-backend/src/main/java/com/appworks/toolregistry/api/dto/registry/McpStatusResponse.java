package com.appworks.toolregistry.api.dto.registry;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

@Schema(description = "MCP server status")
public record McpStatusResponse(
        String serverName,
        String serverVersion,
        String transport,
        String sseEndpoint,
        int registeredToolCount,
        int liveGroupServers,
        Instant lastSyncAt
) {
}
