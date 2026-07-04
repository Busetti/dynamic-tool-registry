package com.appworks.toolregistry.api.dto.tool;

import com.appworks.toolregistry.domain.model.ToolStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@Schema(description = "Tool status change request")
public record StatusChangeRequest(
        @NotNull ToolStatus status
) {
}
