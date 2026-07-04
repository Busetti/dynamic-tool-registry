package com.appworks.toolregistry.api.dto.test;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

@Schema(description = "Endpoint availability status (cached ~30s)")
public record HealthCheckResponse(
        String toolId,
        String toolName,
        boolean healthy,
        Integer statusCode,
        long latencyMs,
        String message,
        Instant checkedAt
) {
}
