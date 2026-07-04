package com.appworks.toolregistry.api.mapper;

import com.appworks.toolregistry.api.dto.group.GroupRequest;
import com.appworks.toolregistry.api.dto.group.GroupResponse;
import com.appworks.toolregistry.domain.model.Group;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface GroupMapper {

    @Mapping(target = "id", source = "group.id")
    @Mapping(target = "toolCount", source = "toolCount")
    @Mapping(target = "mcpSseUrl",
            expression = "java(group.getMcpKey() == null ? null : \"/mcp/group/\" + group.getMcpKey() + \"/sse\")")
    GroupResponse toResponse(Group group, long toolCount);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "schemaVersion", ignore = true)
    @Mapping(target = "mcpKey", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Group toEntity(GroupRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "schemaVersion", ignore = true)
    @Mapping(target = "mcpKey", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(GroupRequest request, @MappingTarget Group group);
}
