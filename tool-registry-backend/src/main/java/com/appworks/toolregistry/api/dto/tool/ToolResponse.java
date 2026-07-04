package com.appworks.toolregistry.api.dto.tool;

import com.appworks.toolregistry.domain.model.ToolStatus;
import com.appworks.toolregistry.domain.model.ToolType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.List;

@Schema(description = "Full tool details (sensitive header values are masked)")
public record ToolResponse(
        String id,
        String toolName,
        String displayName,
        String description,
        String businessPurpose,
        String businessCapability,
        String category,
        List<String> tags,
        String version,
        ToolStatus status,
        List<String> groupIds,
        ToolType toolType,
        HttpConfigDto httpConfig,
        DocumentationDto documentation,
        ExamplesDto examples,
        AiContextDto aiContext,
        Instant createdAt,
        Instant updatedAt
) {
}
