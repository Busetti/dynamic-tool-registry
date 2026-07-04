package com.appworks.toolregistry.application.event;

import com.appworks.toolregistry.domain.model.Tool;

/**
 * Published after a tool is persisted (or deleted). The MCP synchronizer
 * listens to keep the live MCP registry in lockstep with MongoDB.
 */
public record ToolChangedEvent(ChangeType type, Tool tool) {

    public enum ChangeType {
        CREATED,
        UPDATED,
        DELETED
    }
}
