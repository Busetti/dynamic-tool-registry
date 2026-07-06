package com.appworks.toolregistry.api.dto.playground;

/** The fixed token cost an agent pays just to have a tool loaded in context. */
public record ToolDefinitionCost(
        String toolId,
        String toolName,
        String displayName,
        String status,
        int descriptionTokens,
        int schemaTokens,
        int definitionTokens
) {
}
