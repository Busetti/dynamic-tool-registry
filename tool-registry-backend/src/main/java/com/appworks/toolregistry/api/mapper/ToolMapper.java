package com.appworks.toolregistry.api.mapper;

import com.appworks.toolregistry.api.dto.tool.HeaderDto;
import com.appworks.toolregistry.api.dto.tool.ToolRequest;
import com.appworks.toolregistry.api.dto.tool.ToolResponse;
import com.appworks.toolregistry.api.dto.tool.ToolSummaryResponse;
import com.appworks.toolregistry.domain.model.Tool;
import com.appworks.toolregistry.domain.model.ToolHeader;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface ToolMapper {

    String MASKED_VALUE = "********";

    ToolResponse toResponse(Tool tool);

    @Mapping(target = "method", source = "httpConfig.method")
    @Mapping(target = "uri", source = "httpConfig.uri")
    @Mapping(target = "responseFormat",
            expression = "java(tool.getResponseControl() == null || tool.getResponseControl().getFormat() == null ? \"JSON\" : tool.getResponseControl().getFormat().name())")
    @Mapping(target = "limitEnabled",
            expression = "java(tool.getResponseControl() != null && tool.getResponseControl().isLimitEnabled())")
    ToolSummaryResponse toSummary(Tool tool);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "schemaVersion", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "aiContext.embedding", ignore = true)
    @Mapping(target = "aiContext.embeddingModel", ignore = true)
    @Mapping(target = "aiContext.embeddingUpdatedAt", ignore = true)
    Tool toEntity(ToolRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "schemaVersion", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "aiContext.embedding", ignore = true)
    @Mapping(target = "aiContext.embeddingModel", ignore = true)
    @Mapping(target = "aiContext.embeddingUpdatedAt", ignore = true)
    void updateEntity(ToolRequest request, @MappingTarget Tool tool);

    /** Sensitive header values never leave the API unmasked. */
    default HeaderDto toHeaderDto(ToolHeader header) {
        if (header == null) {
            return null;
        }
        String value = header.isSensitive() && header.getValue() != null ? MASKED_VALUE : header.getValue();
        return new HeaderDto(header.getName(), value, header.getDescription(),
                header.isRequired(), header.isSensitive());
    }
}
