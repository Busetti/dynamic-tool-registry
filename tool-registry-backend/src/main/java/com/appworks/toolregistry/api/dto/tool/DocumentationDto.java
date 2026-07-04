package com.appworks.toolregistry.api.dto.tool;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

@Schema(description = "Tool documentation")
public record DocumentationDto(

        @Size(max = 100000)
        String markdown,

        @Size(max = 2000)
        String swaggerUrl,

        List<@Valid ExternalLinkDto> externalLinks,

        @Size(max = 10000)
        String notes
) {
    @Schema(description = "External documentation link")
    public record ExternalLinkDto(
            @NotBlank @Size(max = 200) String title,
            @NotBlank @Size(max = 2000) String url
    ) {
    }
}
