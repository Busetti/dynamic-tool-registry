package com.appworks.toolregistry.domain.model;

/**
 * Lifecycle status of a tool. Only ACTIVE tools are exposed through the MCP registry.
 */
public enum ToolStatus {
    DRAFT,
    ACTIVE,
    DEPRECATED,
    DISABLED
}
