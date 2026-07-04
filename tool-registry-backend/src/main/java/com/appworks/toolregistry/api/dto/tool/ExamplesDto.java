package com.appworks.toolregistry.api.dto.tool;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.Map;

@Schema(description = "Request/response examples and response schema")
public record ExamplesDto(

        List<@Valid RequestExampleDto> requestExamples,

        List<@Valid ResponseExampleDto> responseExamples,

        @Schema(description = "JSON Schema (string) describing the response shape")
        @Size(max = 100000)
        String responseSchema
) {
    public record RequestExampleDto(
            @NotBlank @Size(max = 200) String name,
            @Size(max = 2000) String description,
            Map<String, Object> arguments
    ) {
    }

    public record ResponseExampleDto(
            @NotBlank @Size(max = 200) String name,
            Integer statusCode,
            @Size(max = 100000) String body
    ) {
    }
}
