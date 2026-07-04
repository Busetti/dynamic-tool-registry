package com.appworks.toolregistry.application.event;

import com.appworks.toolregistry.domain.model.Group;

/**
 * Published after group mutations that affect the group's MCP endpoint.
 * {@code previousMcpKey} is set for KEY_REGENERATED so the old server can be closed.
 */
public record GroupChangedEvent(ChangeType type, Group group, String previousMcpKey) {

    public enum ChangeType {
        DELETED,
        KEY_REGENERATED
    }

    public static GroupChangedEvent deleted(Group group) {
        return new GroupChangedEvent(ChangeType.DELETED, group, group.getMcpKey());
    }

    public static GroupChangedEvent keyRegenerated(Group group, String previousMcpKey) {
        return new GroupChangedEvent(ChangeType.KEY_REGENERATED, group, previousMcpKey);
    }
}
