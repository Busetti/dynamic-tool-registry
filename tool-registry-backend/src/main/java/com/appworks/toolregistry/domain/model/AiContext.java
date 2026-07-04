package com.appworks.toolregistry.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Context that helps AI models decide when and how to use the tool.
 * The embedding fields are reserved for future vector search — they stay
 * null until an embedding pipeline is introduced (no schema migration needed).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiContext {

    private String naturalLanguageDescription;

    @Builder.Default
    private List<String> useCases = new ArrayList<>();

    private String expectedInputs;
    private String expectedOutputs;

    @Builder.Default
    private List<String> examplePrompts = new ArrayList<>();

    @Builder.Default
    private List<String> keywords = new ArrayList<>();

    private String businessDomain;

    @Builder.Default
    private List<String> searchAliases = new ArrayList<>();

    /** Reserved for future vector search. */
    private double[] embedding;
    private String embeddingModel;
    private Instant embeddingUpdatedAt;
}
