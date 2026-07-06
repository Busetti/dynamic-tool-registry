package com.appworks.toolregistry.application.response;

import com.appworks.toolregistry.domain.model.ResponseFormat;
import lombok.Builder;

/**
 * The outcome of applying a tool's response controls to a raw response body:
 * the final text delivered to the model plus what happened to it.
 */
@Builder
public record ProcessedResponse(
        String body,
        ResponseFormat format,
        int originalItems,
        int deliveredItems,
        boolean truncated
) {
}
