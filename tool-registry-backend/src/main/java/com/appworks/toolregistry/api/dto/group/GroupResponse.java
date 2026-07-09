package com.appworks.toolregistry.api.dto.group;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.List;

@Schema(description = "Group details")
public record GroupResponse(
        String id,
        String name,
        @Schema(description = "Unique key granting MCP access to this group's tools")
        String mcpKey,
        @Schema(description = "Group-scoped MCP SSE endpoint path", example = "/mcp/group/ab12cd34.../sse")
        String mcpSseUrl,
        @Schema(description = "Tool-name prefix applied on this group's MCP endpoint")
        String mcpToolPrefix,
        String displayName,
        String description,
        String businessArea,
        String teamName,
        String owner,
        List<String> tags,
        String documentation,
        long toolCount,
        Instant createdAt,
        Instant updatedAt
) {
}
