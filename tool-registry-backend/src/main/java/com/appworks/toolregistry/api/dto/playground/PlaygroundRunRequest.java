package com.appworks.toolregistry.api.dto.playground;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

import java.util.Map;

@Schema(description = "Execute a tool and measure the token cost of its response")
public record PlaygroundRunRequest(

        @NotBlank
        String toolId,

        @Schema(description = "Arguments passed to the tool, keyed by parameter name")
        Map<String, Object> arguments,

        @Schema(description = "Preview a specific format without changing the saved tool",
                allowableValues = {"JSON", "TOON"})
        String formatOverride
) {
}
