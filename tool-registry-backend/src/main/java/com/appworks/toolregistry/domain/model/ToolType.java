package com.appworks.toolregistry.domain.model;

/**
 * Protocol/execution type of a tool. Acts as the discriminator for the
 * type-specific configuration subdocument and selects the {@code ToolInvoker}
 * strategy at execution time.
 *
 * <p>Only HTTP is implemented today; the remaining values reserve the
 * extension points so new protocols can be added without schema changes.
 */
public enum ToolType {
    HTTP,
    GRAPHQL,
    SOAP,
    GRPC,
    DB_QUERY,
    KAFKA,
    JAVA_FUNCTION,
    REMOTE_MCP
}
