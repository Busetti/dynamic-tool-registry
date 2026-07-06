package com.appworks.toolregistry.domain.model;

/**
 * The serialization format a tool returns to the AI model.
 * TOON (Token-Oriented Object Notation) is typically 30-50% cheaper in tokens
 * than JSON for uniform arrays; JSON is the default and safest choice.
 */
public enum ResponseFormat {
    JSON,
    TOON
}
