package com.appworks.toolregistry.api.controller;

import com.appworks.toolregistry.api.dto.registry.McpStatusResponse;
import com.appworks.toolregistry.api.dto.registry.RegisteredToolResponse;
import com.appworks.toolregistry.api.dto.tool.ToolSummaryResponse;
import com.appworks.toolregistry.api.mapper.ToolMapper;
import com.appworks.toolregistry.domain.model.ToolStatus;
import com.appworks.toolregistry.infrastructure.persistence.ToolRepository;
import com.appworks.toolregistry.mcp.McpRegistrySynchronizer;
import com.appworks.toolregistry.mcp.McpToolRegistry;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.mongodb.core.query.TextCriteria;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@Tag(name = "MCP Registry", description = "Live view and control of the MCP tool registry")
@RestController
@RequestMapping("/api/v1/mcp")
@RequiredArgsConstructor
public class McpRegistryController {

    private final McpToolRegistry mcpToolRegistry;
    private final com.appworks.toolregistry.mcp.group.GroupMcpServerRegistry groupMcpServerRegistry;
    private final McpRegistrySynchronizer synchronizer;
    private final ToolRepository toolRepository;
    private final ToolMapper toolMapper;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    @Value("${spring.ai.mcp.server.name}")
    private String serverName;

    @Value("${spring.ai.mcp.server.version}")
    private String serverVersion;

    @Operation(summary = "MCP server status")
    @GetMapping("/status")
    public McpStatusResponse status() {
        return new McpStatusResponse(
                serverName,
                serverVersion,
                "SSE (HTTP)",
                "/sse",
                mcpToolRegistry.count(),
                groupMcpServerRegistry.count(),
                mcpToolRegistry.lastSyncAt());
    }

    @Operation(summary = "Tools currently registered with the live MCP server")
    @GetMapping("/tools")
    public List<RegisteredToolResponse> registeredTools() {
        return mcpToolRegistry.listRegistered().stream()
                .map(spec -> new RegisteredToolResponse(
                        spec.tool().name(),
                        spec.tool().description(),
                        schemaToString(spec)))
                .sorted(java.util.Comparator.comparing(RegisteredToolResponse::name))
                .toList();
    }

    @Operation(summary = "Search ACTIVE tools", description = "Weighted full-text search over the MCP-exposed catalog")
    @GetMapping("/tools/search")
    public List<ToolSummaryResponse> search(@Parameter(description = "Search query") @RequestParam String q) {
        return toolRepository.findAllBy(
                        TextCriteria.forDefaultLanguage().matching(q),
                        PageRequest.of(0, 25))
                .getContent().stream()
                .filter(tool -> tool.getStatus() == ToolStatus.ACTIVE)
                .map(toolMapper::toSummary)
                .toList();
    }

    @Operation(summary = "Force a full resync of MongoDB against the MCP server")
    @PostMapping("/refresh")
    public Map<String, Object> refresh() {
        int count = synchronizer.resync();
        return Map.of("registeredTools", count, "status", "resynced");
    }

    @Operation(summary = "MCP-exposed (ACTIVE) tools belonging to a group")
    @GetMapping("/groups/{groupId}/tools")
    public List<ToolSummaryResponse> groupTools(@PathVariable String groupId) {
        return toolRepository.findByStatusAndGroupIdsContaining(ToolStatus.ACTIVE, groupId).stream()
                .map(toolMapper::toSummary)
                .toList();
    }

    private String schemaToString(io.modelcontextprotocol.server.McpServerFeatures.SyncToolSpecification spec) {
        Object schema = spec.tool().inputSchema();
        if (schema == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(schema);
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            return schema.toString();
        }
    }
}
