package com.appworks.toolregistry.api.dto.playground;

import lombok.Builder;

/**
 * The token analysis of a single tool execution: exactly what the model would
 * receive in each format, plus the token deltas.
 */
@Builder
public record PlaygroundRunReport(
        String toolId,
        String toolName,
        boolean success,
        Integer statusCode,
        long durationMs,
        String deliveredFormat,
        String responseJson,
        String responseToon,
        int tokensJson,
        int tokensToon,
        int tokensSaved,
        double savedPct,
        int definitionTokens,
        int sizeBytes,
        int originalItems,
        int deliveredItems,
        boolean truncated,
        boolean warning,
        String warningReason,
        String tokenEncoding,
        String error
) {
}
