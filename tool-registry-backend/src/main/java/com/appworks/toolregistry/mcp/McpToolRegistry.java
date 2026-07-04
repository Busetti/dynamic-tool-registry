package com.appworks.toolregistry.mcp;

import com.appworks.toolregistry.domain.model.Tool;
import io.modelcontextprotocol.server.McpServerFeatures;
import io.modelcontextprotocol.server.McpSyncServer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Live in-memory view of the tools currently exposed through the MCP server.
 * Every mutation is pushed to the {@link McpSyncServer} immediately — the SDK
 * notifies connected clients via {@code notifications/tools/list_changed},
 * so no restart is ever required.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class McpToolRegistry {

    private final McpSyncServer mcpSyncServer;
    private final ToolDefinitionFactory toolDefinitionFactory;

    private final Map<String, McpServerFeatures.SyncToolSpecification> registered = new ConcurrentHashMap<>();
    private volatile Instant lastSyncAt;

    public void register(Tool tool) {
        McpServerFeatures.SyncToolSpecification spec = toolDefinitionFactory.createSpecification(tool);
        registered.compute(tool.getToolName(), (name, existing) -> {
            if (existing != null) {
                mcpSyncServer.removeTool(name);
            }
            mcpSyncServer.addTool(spec);
            return spec;
        });
        lastSyncAt = Instant.now();
        log.info("MCP registry: registered tool '{}'", tool.getToolName());
    }

    public void unregister(String toolName) {
        registered.computeIfPresent(toolName, (name, spec) -> {
            mcpSyncServer.removeTool(name);
            log.info("MCP registry: unregistered tool '{}'", name);
            return null;
        });
        lastSyncAt = Instant.now();
    }

    public boolean isRegistered(String toolName) {
        return registered.containsKey(toolName);
    }

    public List<McpServerFeatures.SyncToolSpecification> listRegistered() {
        return List.copyOf(registered.values());
    }

    public int count() {
        return registered.size();
    }

    public Instant lastSyncAt() {
        return lastSyncAt;
    }
}
