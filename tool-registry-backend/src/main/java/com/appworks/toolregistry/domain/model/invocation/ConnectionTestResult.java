package com.appworks.toolregistry.domain.model.invocation;

import lombok.Builder;

/**
 * Result of a lightweight reachability check against the tool's endpoint.
 */
@Builder
public record ConnectionTestResult(
        boolean reachable,
        Integer statusCode,
        long latencyMs,
        String message
) {
}
