package com.appworks.toolregistry.api.dto.test;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.Map;

@Schema(description = "Arguments for a sandbox execution of a tool")
public record ExecuteToolRequest(
        @Schema(description = "Argument values keyed by parameter name",
                example = "{\"employeeId\": \"42\"}")
        Map<String, Object> arguments
) {
}
