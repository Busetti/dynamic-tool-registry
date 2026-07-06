package com.appworks.toolregistry.application.response;

import com.appworks.toolregistry.domain.model.ResponseControl;
import com.appworks.toolregistry.domain.model.ResponseFormat;
import com.appworks.toolregistry.domain.model.Tool;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Applies a tool's opt-in {@link ResponseControl} to a raw response body,
 * producing the exact text delivered to the AI model. A pure transformation
 * shared by the live MCP path ({@code ToolDefinitionFactory}) and the token
 * playground, so the playground measures precisely what production sends.
 *
 * <p>Two steps, both no-ops unless the tool opted in:
 * <ol>
 *   <li><b>Limit</b> — trim an oversized top-level (or {@code data/items/results})
 *       array to {@code maxItems} and append a truncation note.</li>
 *   <li><b>Format</b> — convert valid JSON to TOON when the tool selects it.</li>
 * </ol>
 * Non-JSON bodies and tools with no {@code responseControl} pass through unchanged.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ResponseProcessor {

    private static final List<String> ARRAY_WRAPPER_FIELDS = List.of("data", "items", "results", "records");

    private final ObjectMapper objectMapper;
    private final ToonEncoder toonEncoder;

    /** Processes a body using the tool's saved format; see {@link #process(Tool, String, ResponseFormat)}. */
    public ProcessedResponse process(Tool tool, String rawBody) {
        return process(tool, rawBody, null);
    }

    /**
     * @param formatOverride when non-null, overrides the tool's saved format
     *                       (used by the playground/test console to preview) —
     *                       the saved tool is not modified.
     */
    public ProcessedResponse process(Tool tool, String rawBody, ResponseFormat formatOverride) {
        ResponseControl control = tool.getResponseControl();
        ResponseFormat format = formatOverride != null ? formatOverride
                : (control != null && control.getFormat() != null ? control.getFormat() : ResponseFormat.JSON);

        if (rawBody == null || rawBody.isBlank()) {
            return ProcessedResponse.builder()
                    .body(rawBody == null ? "" : rawBody)
                    .format(ResponseFormat.JSON)
                    .originalItems(0).deliveredItems(0).truncated(false)
                    .build();
        }

        JsonNode root;
        try {
            root = objectMapper.readTree(rawBody);
        } catch (Exception e) {
            // Not JSON — deliver untouched regardless of controls.
            return ProcessedResponse.builder()
                    .body(rawBody).format(ResponseFormat.JSON)
                    .originalItems(0).deliveredItems(0).truncated(false)
                    .build();
        }

        // ---- Step 1: limiting ----
        ArrayNode array = locateArray(root);
        int originalItems = array != null ? array.size() : 0;
        int deliveredItems = originalItems;
        boolean truncated = false;
        String truncationNote = null;

        if (array != null && control != null && control.isLimitEnabled()
                && control.getMaxItems() != null && originalItems > control.getMaxItems()) {
            int max = control.getMaxItems();
            for (int i = array.size() - 1; i >= max; i--) {
                array.remove(i);
            }
            deliveredItems = max;
            truncated = true;
            String param = control.getLimitParamName() != null ? control.getLimitParamName() : "limit";
            truncationNote = "truncated to %d of %d items; request more via '%s'"
                    .formatted(max, originalItems, param);
        }

        // ---- Step 2: format ----
        String jsonBody = truncated ? root.toString() : rawBody;
        if (format == ResponseFormat.TOON) {
            try {
                String toon = toonEncoder.encode(root);
                if (truncationNote != null) {
                    toon = "# " + truncationNote + "\n" + toon;
                }
                return ProcessedResponse.builder()
                        .body(toon).format(ResponseFormat.TOON)
                        .originalItems(originalItems).deliveredItems(deliveredItems).truncated(truncated)
                        .build();
            } catch (Exception e) {
                log.warn("TOON encoding failed for tool '{}', falling back to JSON: {}",
                        tool.getToolName(), e.getMessage());
            }
        }

        if (truncationNote != null) {
            ObjectNode wrapper = objectMapper.createObjectNode();
            wrapper.put("_note", truncationNote);
            wrapper.set("data", root);
            jsonBody = wrapper.toString();
        }
        return ProcessedResponse.builder()
                .body(jsonBody).format(ResponseFormat.JSON)
                .originalItems(originalItems).deliveredItems(deliveredItems).truncated(truncated)
                .build();
    }

    /** True when the (untrimmed) body is an array whose size exceeds the threshold. */
    public boolean isUnboundedArray(String rawBody, int itemThreshold) {
        if (rawBody == null || rawBody.isBlank()) {
            return false;
        }
        try {
            ArrayNode array = locateArray(objectMapper.readTree(rawBody));
            return array != null && array.size() > itemThreshold;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Returns the call arguments with the configured default limit injected when
     * the tool is paginated and the caller omitted the limit parameter. Never
     * mutates the input (it may be immutable); returns a new map only when a
     * value is added. Shared by the live MCP path and the test console.
     */
    public static Map<String, Object> applyDefaultLimit(Tool tool, Map<String, Object> arguments) {
        ResponseControl control = tool.getResponseControl();
        if (arguments == null || control == null || !control.isLimitEnabled() || !control.isPaginated()
                || control.getDefaultLimit() == null || control.getLimitParamName() == null
                || arguments.containsKey(control.getLimitParamName())) {
            return arguments;
        }
        Map<String, Object> merged = new HashMap<>(arguments);
        merged.put(control.getLimitParamName(), control.getDefaultLimit());
        return merged;
    }

    private ArrayNode locateArray(JsonNode root) {
        if (root instanceof ArrayNode arrayNode) {
            return arrayNode;
        }
        if (root instanceof ObjectNode) {
            for (String field : ARRAY_WRAPPER_FIELDS) {
                if (root.get(field) instanceof ArrayNode wrapped) {
                    return wrapped;
                }
            }
        }
        return null;
    }
}
