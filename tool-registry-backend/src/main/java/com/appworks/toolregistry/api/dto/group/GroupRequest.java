package com.appworks.toolregistry.api.dto.group;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

@Schema(description = "Request payload for creating or updating a group")
public record GroupRequest(

        @Schema(description = "Unique machine name (kebab-case)", example = "payments-platform")
        @NotBlank
        @Pattern(regexp = "^[a-z][a-z0-9-]{1,63}$",
                message = "must start with a letter and contain only lowercase letters, digits and hyphens")
        String name,

        @Schema(description = "Human-friendly name", example = "Payments Platform")
        @NotBlank @Size(max = 120)
        String displayName,

        @Schema(description = "What this group is about", example = "APIs owned by the payments platform team")
        @Size(max = 2000)
        String description,

        @Schema(description = "Business area the group belongs to", example = "Finance")
        @Size(max = 120)
        String businessArea,

        @Schema(description = "Owning team name", example = "Payments Core")
        @Size(max = 120)
        String teamName,

        @Schema(description = "Owner contact", example = "jane.doe@corp.com")
        @Size(max = 200)
        String owner,

        @Schema(description = "Free-form tags", example = "[\"payments\", \"core\"]")
        List<@NotBlank @Size(max = 50) String> tags,

        @Schema(description = "Markdown documentation")
        @Size(max = 50000)
        String documentation
) {
}
