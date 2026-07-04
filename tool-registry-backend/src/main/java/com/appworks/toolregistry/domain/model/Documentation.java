package com.appworks.toolregistry.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Documentation {

    /** Rich markdown documentation. */
    private String markdown;

    private String swaggerUrl;

    @Builder.Default
    private List<ExternalLink> externalLinks = new ArrayList<>();

    private String notes;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExternalLink {
        private String title;
        private String url;
    }
}
