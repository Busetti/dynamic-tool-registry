package com.appworks.toolregistry.api.dto.playground;

import lombok.Builder;

import java.util.List;

/**
 * Executes a set of tools and reports the real token usage of a full agent
 * turn: the fixed definition cost of loading every tool plus the actual
 * response tokens each returned.
 */
@Builder
public record BatchRunReport(
        List<BatchToolResult> results,
        int totalDefinitionTokens,
        int totalResponseTokens,
        int totalTokens,
        int toolCount,
        int executedCount,
        String tokenEncoding
) {

    @Builder
    public record BatchToolResult(
            String toolId,
            String toolName,
            String displayName,
            boolean executed,
            String skipReason,
            Integer statusCode,
            long durationMs,
            String deliveredFormat,
            int responseTokens,
            int tokensJson,
            int tokensToon,
            int definitionTokens,
            boolean truncated,
            boolean warning,
            String warningReason
    ) {
    }
}
