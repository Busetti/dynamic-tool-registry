package com.appworks.toolregistry.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Opt-in, per-tool controls over what a tool returns to the AI model, aimed at
 * token efficiency. Protocol-agnostic (lives on {@link Tool}, not on a
 * protocol config), so future protocols reuse it unchanged.
 *
 * <p>When this is {@code null} on a tool, the platform delivers the raw JSON
 * response unchanged — existing tools are entirely unaffected.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResponseControl {

    /** JSON (default) or TOON — the registrant's choice, never automatic. */
    @Builder.Default
    private ResponseFormat format = ResponseFormat.JSON;

    /** When true, oversized array responses are trimmed to {@link #maxItems}. */
    private boolean limitEnabled;

    /** Max array elements delivered to the model when {@link #limitEnabled}. */
    private Integer maxItems;

    /** Marks an API that supports pagination — surfaces hints to the model. */
    private boolean paginated;

    /** Name of the query parameter that limits result size (e.g. "limit", "_limit"). */
    private String limitParamName;

    /** Name of the pagination offset/page query parameter (e.g. "offset", "page"). */
    private String offsetParamName;

    /** Default value injected for {@link #limitParamName} when the caller omits it. */
    private Integer defaultLimit;
}
