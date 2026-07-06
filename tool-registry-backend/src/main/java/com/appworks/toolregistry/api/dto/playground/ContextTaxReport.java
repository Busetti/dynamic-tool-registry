package com.appworks.toolregistry.api.dto.playground;

import java.util.List;

/**
 * Aggregate "context tax": the total tokens an agent spends just to load a set
 * of tools (or a group) before making any call — the concrete cost of exposing
 * many tools to an LLM.
 */
public record ContextTaxReport(
        List<ToolDefinitionCost> tools,
        int totalDefinitionTokens,
        int toolCount,
        String tokenEncoding
) {
}
