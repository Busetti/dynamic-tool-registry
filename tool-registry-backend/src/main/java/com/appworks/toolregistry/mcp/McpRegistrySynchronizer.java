package com.appworks.toolregistry.mcp;

import com.appworks.toolregistry.application.event.GroupChangedEvent;
import com.appworks.toolregistry.application.event.ToolChangedEvent;
import com.appworks.toolregistry.domain.model.Tool;
import com.appworks.toolregistry.domain.model.ToolStatus;
import com.appworks.toolregistry.infrastructure.persistence.GroupRepository;
import com.appworks.toolregistry.infrastructure.persistence.ToolRepository;
import com.appworks.toolregistry.mcp.group.GroupMcpServerRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Keeps the live MCP registry in lockstep with MongoDB:
 * a full load on startup, incremental updates on every tool change event,
 * and a manual {@link #resync()} escape hatch.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class McpRegistrySynchronizer {

    private final ToolRepository toolRepository;
    private final GroupRepository groupRepository;
    private final McpToolRegistry mcpToolRegistry;
    private final GroupMcpServerRegistry groupMcpServerRegistry;

    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        backfillMissingGroupMcpKeys();
        List<Tool> activeTools = toolRepository.findByStatus(ToolStatus.ACTIVE);
        int registered = 0;
        for (Tool tool : activeTools) {
            try {
                mcpToolRegistry.register(tool);
                registered++;
            } catch (Exception e) {
                log.error("Skipping tool '{}' — failed to register with MCP server: {}",
                        tool.getToolName(), e.getMessage());
            }
        }
        log.info("MCP registry initialized: {}/{} active tools registered", registered, activeTools.size());
    }

    @EventListener
    public void onToolChanged(ToolChangedEvent event) {
        Tool tool = event.tool();
        switch (event.type()) {
            case CREATED, UPDATED -> {
                if (tool.getStatus() == ToolStatus.ACTIVE) {
                    mcpToolRegistry.register(tool);
                } else {
                    mcpToolRegistry.unregister(tool.getToolName());
                }
                // Diff-based reconciliation against every live group server —
                // covers activation, group moves and multi-group membership.
                groupMcpServerRegistry.syncTool(tool);
            }
            case DELETED -> {
                mcpToolRegistry.unregister(tool.getToolName());
                groupMcpServerRegistry.removeToolEverywhere(tool.getToolName());
            }
        }
    }

    @EventListener
    public void onGroupChanged(GroupChangedEvent event) {
        switch (event.type()) {
            case DELETED, KEY_REGENERATED, CONFIG_CHANGED -> {
                // Close the live server; it is lazily rebuilt with fresh
                // settings on the next consumer connection.
                if (event.previousMcpKey() != null) {
                    groupMcpServerRegistry.remove(event.previousMcpKey());
                }
            }
        }
    }

    /** One-time backfill so groups created before this feature get an MCP key. */
    private void backfillMissingGroupMcpKeys() {
        groupRepository.findAll().stream()
                .filter(group -> group.getMcpKey() == null)
                .forEach(group -> {
                    group.setMcpKey(java.util.UUID.randomUUID().toString().replace("-", ""));
                    groupRepository.save(group);
                    log.info("Backfilled MCP key for group '{}'", group.getName());
                });
    }

    /** Full diff between MongoDB and the in-memory registry. */
    public synchronized int resync() {
        List<Tool> activeTools = toolRepository.findByStatus(ToolStatus.ACTIVE);
        Set<String> activeNames = activeTools.stream().map(Tool::getToolName).collect(Collectors.toSet());

        Set<String> registeredNames = mcpToolRegistry.listRegistered().stream()
                .map(spec -> spec.tool().name())
                .collect(Collectors.toCollection(HashSet::new));
        registeredNames.stream()
                .filter(name -> !activeNames.contains(name))
                .forEach(mcpToolRegistry::unregister);

        activeTools.forEach(mcpToolRegistry::register);
        log.info("MCP registry resynced: {} active tools", activeTools.size());
        return activeTools.size();
    }
}
