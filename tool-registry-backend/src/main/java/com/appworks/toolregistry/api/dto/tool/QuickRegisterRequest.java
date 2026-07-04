package com.appworks.toolregistry.api.dto.tool;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

@Schema(description = "One-shot tool registration from a curl command plus the mandatory business details")
public record QuickRegisterRequest(

        @Schema(description = "The curl command describing the API call")
        @NotBlank @Size(max = 50000)
        String curl,

        @Schema(description = "Unique MCP-safe machine name (snake_case)", example = "create_order")
        @NotBlank
        @Pattern(regexp = "^[a-z][a-z0-9_]{2,63}$",
                message = "must start with a lowercase letter and contain only lowercase letters, digits and underscores (3-64 chars)")
        String toolName,

        @NotBlank @Size(max = 200)
        String displayName,

        @Schema(description = "What the tool does — shown to AI models")
        @NotBlank @Size(max = 5000)
        String description,

        @Size(max = 5000)
        String businessPurpose,

        @Size(max = 100)
        String category,

        List<String> tags,

        List<String> groupIds
) {
}
