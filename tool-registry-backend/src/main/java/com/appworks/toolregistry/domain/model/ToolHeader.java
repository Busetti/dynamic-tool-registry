package com.appworks.toolregistry.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * A static HTTP header sent with every invocation of the tool.
 * Sensitive headers are masked in execution echoes and API responses.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ToolHeader {

    private String name;
    private String value;
    private String description;

    @Builder.Default
    private boolean required = false;

    @Builder.Default
    private boolean sensitive = false;
}
