package com.appworks.toolregistry.api.dto.tool;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

@Schema(description = "HTTP execution configuration (toolType = HTTP)")
public record HttpConfigDto(

        @Schema(allowableValues = {"GET", "POST"})
        @NotBlank
        @Pattern(regexp = "^(GET|POST)$", message = "only GET and POST are supported")
        String method,

        @Schema(description = "Absolute URI, may contain {var} path variable templates",
                example = "https://api.corp.com/employees/{employeeId}")
        @NotBlank @Size(max = 2000)
        @Pattern(regexp = "^https?://.*", message = "must be an absolute http(s) URI")
        String uri,

        @Schema(example = "application/json")
        String contentType,

        @Min(100) @Max(120000)
        Integer timeoutMs,

        List<@Valid HeaderDto> headers,

        List<@Valid ParameterDto> queryParameters,

        List<@Valid ParameterDto> pathVariables,

        List<@Valid ParameterDto> bodyParameters,

        @Schema(description = "POST body template with {{param}} placeholders",
                example = "{\"query\": \"{{searchText}}\"}")
        @Size(max = 100000)
        String requestBodyTemplate
) {
}
