package com.appworks.toolregistry.api.dto.registry;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "A tool currently registered with the live MCP server")
public record RegisteredToolResponse(
        String name,
        String description,
        String inputSchema
) {
}
