package com.appworks.toolregistry.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * The central aggregate of the platform: a registered API exposed as an AI tool.
 *
 * <p>{@code toolType} discriminates which protocol config subdocument applies
 * ({@code httpConfig} for HTTP). All protocols share the same business,
 * documentation and AI-context metadata so search and listing stay uniform.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "tools")
public class Tool {

    @Id
    private String id;

    @Builder.Default
    private int schemaVersion = 1;

    /** Unique MCP-safe machine name (snake_case). */
    @Indexed(unique = true)
    private String toolName;

    private String displayName;
    private String description;
    private String businessPurpose;
    private String businessCapability;
    private String category;

    @Builder.Default
    private List<String> tags = new ArrayList<>();

    @Builder.Default
    private String version = "1.0.0";

    @Builder.Default
    private ToolStatus status = ToolStatus.DRAFT;

    @Builder.Default
    private List<String> groupIds = new ArrayList<>();

    @Builder.Default
    private ToolType toolType = ToolType.HTTP;

    private HttpToolConfig httpConfig;

    private Documentation documentation;

    private ToolExamples examples;

    private AiContext aiContext;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
