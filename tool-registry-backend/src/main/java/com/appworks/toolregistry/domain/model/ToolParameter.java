package com.appworks.toolregistry.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * A single tool input parameter (path variable, query parameter or body parameter).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ToolParameter {

    private String name;

    /** JSON schema primitive type: string | number | integer | boolean. */
    @Builder.Default
    private String type = "string";

    private String description;

    @Builder.Default
    private boolean required = true;

    private String defaultValue;

    /** Optional closed set of allowed values (rendered as JSON schema enum). */
    private List<String> enumValues;
}
