package com.appworks.toolregistry.api.dto.tool;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

import java.util.List;

@Schema(description = "Context that helps AI models decide when and how to use the tool")
public record AiContextDto(

        @Size(max = 10000)
        String naturalLanguageDescription,

        List<@Size(max = 2000) String> useCases,

        @Size(max = 5000)
        String expectedInputs,

        @Size(max = 5000)
        String expectedOutputs,

        List<@Size(max = 2000) String> examplePrompts,

        List<@Size(max = 100) String> keywords,

        @Size(max = 200)
        String businessDomain,

        List<@Size(max = 200) String> searchAliases
) {
}
