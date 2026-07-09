package com.appworks.toolregistry.mcp.group;

import com.appworks.toolregistry.domain.model.Group;
import com.appworks.toolregistry.domain.model.Tool;
import com.appworks.toolregistry.domain.model.ToolStatus;
import com.appworks.toolregistry.infrastructure.persistence.ToolRepository;
import com.appworks.toolregistry.mcp.ToolDefinitionFactory;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.modelcontextprotocol.server.McpServer;
import io.modelcontextprotocol.server.McpSyncServer;
import io.modelcontextprotocol.server.transport.WebMvcSseServerTransportProvider;
import io.modelcontextprotocol.spec.McpSchema;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.function.RouterFunction;
import org.springframework.web.servlet.function.ServerResponse;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * One live MCP server per group, keyed by the group's {@code mcpKey}, exposing
 * only that group's ACTIVE tools at {@code /mcp/group/{mcpKey}/sse}.
 *
 * <p>Servers are created lazily on first consumer connection and mutated at
 * runtime as tools change — the SDK notifies connected clients via
 * {@code tools/list_changed}, so group membership changes are visible
 * mid-session without any restart.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GroupMcpServerRegistry {

    public record GroupMcpServer(
            String groupId,
            String mcpKey,
            String toolPrefix,
            McpSyncServer server,
            RouterFunction<ServerResponse> routerFunction) {

        /** The name a tool is published under on this group's endpoint. */
        String exposedName(String toolName) {
            return toolPrefix == null || toolPrefix.isBlank() ? toolName : toolPrefix + "_" + toolName;
        }
    }

    private final ObjectMapper objectMapper;
    private final ToolDefinitionFactory toolDefinitionFactory;
    private final ToolRepository toolRepository;

    @Value("${spring.ai.mcp.server.version:1.0.0}")
    private String serverVersion;

    /** mcpKey → live group server. */
    private final Map<String, GroupMcpServer> servers = new ConcurrentHashMap<>();

    /** toolName → mcpKeys of the group servers the tool is currently registered with. */
    private final Map<String, Set<String>> toolRegistrations = new ConcurrentHashMap<>();

    public Optional<GroupMcpServer> get(String mcpKey) {
        return Optional.ofNullable(servers.get(mcpKey));
    }

    public int count() {
        return servers.size();
    }

    /** Creates (or returns) the live MCP server for a group and loads its ACTIVE tools. */
    public GroupMcpServer getOrCreate(Group group) {
        return servers.computeIfAbsent(group.getMcpKey(), key -> {
            String base = "/mcp/group/" + key;
            WebMvcSseServerTransportProvider transport = new WebMvcSseServerTransportProvider(
                    objectMapper, "", base + "/message", base + "/sse");
            McpSyncServer server = McpServer.sync(transport)
                    .serverInfo("tool-registry-" + group.getName(), serverVersion)
                    .capabilities(McpSchema.ServerCapabilities.builder().tools(true).build())
                    .build();

            GroupMcpServer groupServer = new GroupMcpServer(
                    group.getId(), key, group.getMcpToolPrefix(), server, transport.getRouterFunction());
            List<Tool> tools = toolRepository.findByStatusAndGroupIdsContaining(ToolStatus.ACTIVE, group.getId());
            tools.forEach(tool -> addToolTo(groupServer, tool));
            log.info("Started group MCP server for '{}' ({} tools) at {}/sse",
                    group.getName(), tools.size(), base);
            return groupServer;
        });
    }

    /**
     * Reconciles a tool against every live group server: registered exactly with
     * the servers of the groups it belongs to (and only while ACTIVE). Handles
     * create, update, group moves and multi-group membership in one diff.
     */
    public synchronized void syncTool(Tool tool) {
        Set<String> target = new HashSet<>();
        if (tool.getStatus() == ToolStatus.ACTIVE && tool.getGroupIds() != null) {
            servers.values().stream()
                    .filter(gs -> tool.getGroupIds().contains(gs.groupId()))
                    .forEach(gs -> target.add(gs.mcpKey()));
        }
        Set<String> current = toolRegistrations.getOrDefault(tool.getToolName(), Set.of());

        for (String staleKey : current) {
            if (!target.contains(staleKey)) {
                removeToolFrom(staleKey, tool.getToolName());
            }
        }
        for (String key : target) {
            GroupMcpServer groupServer = servers.get(key);
            if (groupServer != null) {
                if (current.contains(key)) {
                    groupServer.server().removeTool(groupServer.exposedName(tool.getToolName()));
                }
                addToolTo(groupServer, tool);
            }
        }

        if (target.isEmpty()) {
            toolRegistrations.remove(tool.getToolName());
        } else {
            toolRegistrations.put(tool.getToolName(), target);
        }
    }

    /** Removes a deleted tool from every group server it was registered with. */
    public synchronized void removeToolEverywhere(String toolName) {
        Set<String> current = toolRegistrations.remove(toolName);
        if (current != null) {
            current.forEach(key -> removeToolFrom(key, toolName));
        }
    }

    /** Shuts down a group server (group deleted or key regenerated). */
    public synchronized void remove(String mcpKey) {
        GroupMcpServer groupServer = servers.remove(mcpKey);
        if (groupServer == null) {
            return;
        }
        toolRegistrations.values().forEach(keys -> keys.remove(mcpKey));
        toolRegistrations.entrySet().removeIf(entry -> entry.getValue().isEmpty());
        try {
            groupServer.server().closeGracefully();
        } catch (Exception e) {
            log.warn("Error closing group MCP server {}: {}", mcpKey, e.getMessage());
        }
        log.info("Stopped group MCP server for key {}", mcpKey);
    }

    private void addToolTo(GroupMcpServer groupServer, Tool tool) {
        try {
            groupServer.server().addTool(toolDefinitionFactory.createSpecification(
                    tool, groupServer.exposedName(tool.getToolName())));
            toolRegistrations.computeIfAbsent(tool.getToolName(), k -> ConcurrentHashMap.newKeySet())
                    .add(groupServer.mcpKey());
        } catch (Exception e) {
            log.error("Failed to register tool '{}' with group server {}: {}",
                    tool.getToolName(), groupServer.mcpKey(), e.getMessage());
        }
    }

    private void removeToolFrom(String mcpKey, String toolName) {
        GroupMcpServer groupServer = servers.get(mcpKey);
        if (groupServer != null) {
            try {
                groupServer.server().removeTool(groupServer.exposedName(toolName));
            } catch (Exception e) {
                log.warn("Failed to remove tool '{}' from group server {}: {}", toolName, mcpKey, e.getMessage());
            }
        }
    }
}
