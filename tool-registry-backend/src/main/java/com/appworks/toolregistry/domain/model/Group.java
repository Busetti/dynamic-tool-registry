package com.appworks.toolregistry.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Organizational unit that owns a collection of related tools.
 * Groups are pure metadata — no authorization semantics.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "groups")
public class Group {

    @Id
    private String id;

    @Builder.Default
    private int schemaVersion = 1;

    private String name;

    /**
     * Unique URL-safe key granting MCP access to this group's tools at
     * {@code /mcp/group/{mcpKey}/sse}. Regenerable — rotating it invalidates
     * the old endpoint.
     */
    private String mcpKey;

    private String displayName;
    private String description;
    private String businessArea;
    private String teamName;
    private String owner;

    @Builder.Default
    private List<String> tags = new ArrayList<>();

    /** Markdown documentation for the group. */
    private String documentation;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
