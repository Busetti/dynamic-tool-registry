package com.appworks.toolregistry.api.dto.tool;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

@Schema(description = "A tool input parameter (path variable, query or body parameter)")
public record ParameterDto(

        @NotBlank
        @Pattern(regexp = "^[a-zA-Z][a-zA-Z0-9_]{0,63}$",
                message = "must start with a letter and contain only letters, digits and underscores")
        String name,

        @Schema(description = "JSON schema type", allowableValues = {"string", "number", "integer", "boolean"})
        @Pattern(regexp = "^(string|number|integer|boolean)$", message = "must be string, number, integer or boolean")
        String type,

        @Size(max = 1000)
        String description,

        Boolean required,

        String defaultValue,

        List<String> enumValues
) {
}
