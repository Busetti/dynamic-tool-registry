package com.appworks.toolregistry.api.dto.tool;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;

@Schema(description = "Opt-in token-efficiency controls for what the tool returns to the AI model")
public record ResponseControlDto(

        @Schema(description = "Response format delivered to the model", example = "JSON",
                allowableValues = {"JSON", "TOON"})
        String format,

        @Schema(description = "Trim oversized array responses to maxItems")
        boolean limitEnabled,

        @Schema(description = "Max array items delivered when limitEnabled", example = "20")
        @Min(1)
        Integer maxItems,

        @Schema(description = "API supports pagination (surfaces hints to the model)")
        boolean paginated,

        @Schema(description = "Query parameter that limits result size", example = "limit")
        String limitParamName,

        @Schema(description = "Pagination offset/page query parameter", example = "offset")
        String offsetParamName,

        @Schema(description = "Default limit injected when the caller omits limitParamName", example = "20")
        @Min(1)
        Integer defaultLimit
) {
}
