package com.appworks.toolregistry.api.controller;

import com.appworks.toolregistry.api.dto.group.GroupRequest;
import com.appworks.toolregistry.api.dto.group.GroupResponse;
import com.appworks.toolregistry.application.GroupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Groups", description = "Organizational groups that own collections of tools")
@RestController
@RequestMapping("/api/v1/groups")
@RequiredArgsConstructor
public class GroupController {

    private final GroupService groupService;
    private final com.appworks.toolregistry.application.ToolService toolService;

    @Operation(summary = "List tools belonging to a group")
    @GetMapping("/{id}/tools")
    public List<com.appworks.toolregistry.api.dto.tool.ToolSummaryResponse> groupTools(@PathVariable String id) {
        return toolService.listByGroup(id);
    }

    @Operation(summary = "Attach an existing tool to this group",
            description = "A tool can belong to multiple groups; attaching updates the group-scoped MCP endpoint live")
    @PutMapping("/{id}/tools/{toolId}")
    public com.appworks.toolregistry.api.dto.tool.ToolResponse attachTool(
            @PathVariable String id, @PathVariable String toolId) {
        return toolService.attachToGroup(id, toolId);
    }

    @Operation(summary = "Detach a tool from this group", description = "The tool itself is not deleted")
    @DeleteMapping("/{id}/tools/{toolId}")
    public com.appworks.toolregistry.api.dto.tool.ToolResponse detachTool(
            @PathVariable String id, @PathVariable String toolId) {
        return toolService.detachFromGroup(id, toolId);
    }

    @Operation(summary = "Create a group")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public GroupResponse create(@Valid @RequestBody GroupRequest request) {
        return groupService.create(request);
    }

    @Operation(summary = "List groups", description = "Optionally filter by tag, business area or free-text search")
    @GetMapping
    public List<GroupResponse> list(
            @Parameter(description = "Filter by tag") @RequestParam(required = false) String tag,
            @Parameter(description = "Filter by business area") @RequestParam(required = false) String businessArea,
            @Parameter(description = "Free-text search over name, description, team and tags")
            @RequestParam(required = false) String search) {
        return groupService.list(tag, businessArea, search);
    }

    @Operation(summary = "Get a group by id")
    @GetMapping("/{id}")
    public GroupResponse get(@PathVariable String id) {
        return groupService.getById(id);
    }

    @Operation(summary = "Regenerate the group's MCP key",
            description = "Rotates the key — the previous /mcp/group/{key}/sse endpoint stops working immediately")
    @PostMapping("/{id}/regenerate-mcp-key")
    public GroupResponse regenerateMcpKey(@PathVariable String id) {
        return groupService.regenerateMcpKey(id);
    }

    @Operation(summary = "Update a group")
    @PutMapping("/{id}")
    public GroupResponse update(@PathVariable String id, @Valid @RequestBody GroupRequest request) {
        return groupService.update(id, request);
    }

    @Operation(summary = "Delete a group",
            description = "Fails with 409 if tools still reference the group unless force=true, which detaches them")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id,
                       @RequestParam(defaultValue = "false") boolean force) {
        groupService.delete(id, force);
    }
}
