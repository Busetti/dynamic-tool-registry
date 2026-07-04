package com.appworks.toolregistry.api.dto.tool;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "A curl command to convert into an HTTP tool configuration")
public record ParseCurlRequest(
        @Schema(example = "curl -X POST 'https://api.corp.com/orders' -H 'X-Api-Key: secret' -d '{\"sku\":\"A1\",\"qty\":2}'")
        @NotBlank @Size(max = 50000)
        String curl
) {
}
