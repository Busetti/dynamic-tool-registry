package com.appworks.toolregistry.api.dto.tool;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "A static HTTP header sent with every invocation")
public record HeaderDto(

        @NotBlank @Size(max = 200)
        String name,

        @Size(max = 4000)
        String value,

        @Size(max = 1000)
        String description,

        Boolean required,

        @Schema(description = "Sensitive header values are masked in API responses and execution echoes")
        Boolean sensitive
) {
}
