package com.appworks.toolregistry.domain.model.invocation;

import lombok.Builder;

import java.util.Map;

/**
 * Outcome of a tool invocation, including a full request echo for the test console.
 * Sensitive header values are already masked by the invoker.
 */
@Builder
public record ToolInvocationResult(
        boolean success,
        Integer statusCode,
        long durationMs,
        String resolvedUri,
        String method,
        Map<String, String> requestHeaders,
        String requestBody,
        Map<String, String> responseHeaders,
        String responseBody,
        String error
) {
}
