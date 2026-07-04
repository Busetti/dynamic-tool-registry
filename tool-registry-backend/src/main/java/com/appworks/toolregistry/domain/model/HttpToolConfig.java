package com.appworks.toolregistry.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * HTTP-specific execution configuration. Present when {@code toolType == HTTP}.
 * Future protocols get their own sibling config subdocuments.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HttpToolConfig {

    /** GET or POST for now. */
    private String method;

    /** Absolute URI, may contain {var} path variable templates. */
    private String uri;

    @Builder.Default
    private String contentType = "application/json";

    @Builder.Default
    private int timeoutMs = 10000;

    @Builder.Default
    private List<ToolHeader> headers = new ArrayList<>();

    @Builder.Default
    private List<ToolParameter> queryParameters = new ArrayList<>();

    @Builder.Default
    private List<ToolParameter> pathVariables = new ArrayList<>();

    @Builder.Default
    private List<ToolParameter> bodyParameters = new ArrayList<>();

    /** POST body template with {{param}} placeholders resolved from bodyParameters. */
    private String requestBodyTemplate;
}
