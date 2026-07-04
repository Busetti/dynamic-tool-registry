package com.appworks.toolregistry.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ToolExamples {

    @Builder.Default
    private List<RequestExample> requestExamples = new ArrayList<>();

    @Builder.Default
    private List<ResponseExample> responseExamples = new ArrayList<>();

    /** JSON Schema (as string) describing the tool's response shape. */
    private String responseSchema;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RequestExample {
        private String name;
        private String description;
        private Map<String, Object> arguments;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResponseExample {
        private String name;
        private Integer statusCode;
        private String body;
    }
}
