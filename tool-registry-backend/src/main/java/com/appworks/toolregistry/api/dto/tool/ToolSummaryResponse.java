package com.appworks.toolregistry.api.dto.tool;

import com.appworks.toolregistry.domain.model.ToolStatus;
import com.appworks.toolregistry.domain.model.ToolType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.List;

@Schema(description = "Lightweight tool representation for lists")
public record ToolSummaryResponse(
        String id,
        String toolName,
        String displayName,
        String description,
        String category,
        List<String> tags,
        String version,
        ToolStatus status,
        List<String> groupIds,
        ToolType toolType,
        String method,
        String uri,
        String responseFormat,
        boolean limitEnabled,
        Instant updatedAt
) {
}
