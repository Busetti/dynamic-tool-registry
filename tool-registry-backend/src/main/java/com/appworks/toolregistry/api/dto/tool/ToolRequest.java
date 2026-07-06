package com.appworks.toolregistry.api.dto.tool;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

@Schema(description = "Request payload for registering or updating a tool")
public record ToolRequest(

        @Schema(description = "Unique MCP-safe machine name (snake_case)", example = "get_employee_by_id")
        @NotBlank
        @Pattern(regexp = "^[a-z][a-z0-9_]{2,63}$",
                message = "must start with a lowercase letter and contain only lowercase letters, digits and underscores (3-64 chars)")
        String toolName,

        @Schema(example = "Get Employee by ID")
        @NotBlank @Size(max = 200)
        String displayName,

        @Schema(description = "What the tool does", example = "Fetches a single employee record by its identifier")
        @NotBlank @Size(max = 5000)
        String description,

        @Schema(description = "Why the tool exists / the business problem it solves")
        @Size(max = 5000)
        String businessPurpose,

        @Schema(description = "Business capability the tool supports", example = "HR / Employee Data")
        @Size(max = 200)
        String businessCapability,

        @Schema(example = "hr")
        @Size(max = 100)
        String category,

        List<@NotBlank @Size(max = 50) String> tags,

        @Schema(example = "1.0.0")
        @Size(max = 20)
        String version,

        @Schema(description = "Groups this tool belongs to (group ids)")
        List<String> groupIds,

        @Schema(description = "Protocol type; only HTTP is currently supported", example = "HTTP")
        @Pattern(regexp = "^HTTP$", message = "only HTTP tools are currently supported")
        String toolType,

        @NotNull @Valid
        HttpConfigDto httpConfig,

        @Schema(description = "Opt-in token-efficiency controls (format, limiting)")
        @Valid
        ResponseControlDto responseControl,

        @Valid
        DocumentationDto documentation,

        @Valid
        ExamplesDto examples,

        @Valid
        AiContextDto aiContext
) {
}
