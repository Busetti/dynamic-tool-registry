package com.appworks.toolregistry.mcp;

import com.appworks.toolregistry.application.response.ResponseProcessor;
import com.appworks.toolregistry.domain.model.AiContext;
import com.appworks.toolregistry.domain.model.ResponseControl;
import com.appworks.toolregistry.domain.model.HttpToolConfig;
import com.appworks.toolregistry.domain.model.Tool;
import com.appworks.toolregistry.domain.model.ToolParameter;
import com.appworks.toolregistry.domain.model.invocation.ToolInvocationResult;
import com.appworks.toolregistry.infrastructure.invoker.ToolInvokerRegistry;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.modelcontextprotocol.server.McpServerFeatures;
import io.modelcontextprotocol.spec.McpSchema;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;

/**
 * Converts a {@link Tool} document into an MCP tool specification:
 * a merged JSON input schema (path + query + body parameters), a rich
 * AI-facing description composed from the tool's business metadata, and a
 * call handler that delegates to the protocol's {@code ToolInvoker}.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ToolDefinitionFactory {

    private final ObjectMapper objectMapper;
    private final ToolInvokerRegistry invokerRegistry;
    private final ResponseProcessor responseProcessor;

    public McpServerFeatures.SyncToolSpecification createSpecification(Tool tool) {
        McpSchema.Tool mcpTool = new McpSchema.Tool(
                tool.getToolName(),
                composeDescription(tool),
                buildInputSchema(tool));

        return new McpServerFeatures.SyncToolSpecification(mcpTool,
                (exchange, arguments) -> execute(tool, arguments));
    }

    private McpSchema.CallToolResult execute(Tool tool, java.util.Map<String, Object> arguments) {
        try {
            java.util.Map<String, Object> args = ResponseProcessor.applyDefaultLimit(tool, arguments);
            ToolInvocationResult result = invokerRegistry.getInvoker(tool.getToolType())
                    .invoke(tool, args);
            if (result.success()) {
                // Apply the tool's opt-in response controls (limit + TOON) to
                // exactly what the model receives.
                String body = responseProcessor.process(tool, result.responseBody()).body();
                return new McpSchema.CallToolResult(List.of(new McpSchema.TextContent(body)), false);
            }
            String error = result.error() != null ? result.error()
                    : "HTTP " + result.statusCode() + ": " + result.responseBody();
            return new McpSchema.CallToolResult(List.of(new McpSchema.TextContent(error)), true);
        } catch (Exception e) {
            log.warn("MCP call to tool '{}' failed", tool.getToolName(), e);
            return new McpSchema.CallToolResult(
                    List.of(new McpSchema.TextContent("Tool invocation failed: " + e.getMessage())), true);
        }
    }

    /**
     * The AI model only sees name + description + schema, so the description
     * carries the tool's business context: purpose, use cases and prompts.
     */
    public String composeDescription(Tool tool) {
        StringBuilder text = new StringBuilder();
        append(text, null, firstNonBlank(
                tool.getAiContext() == null ? null : tool.getAiContext().getNaturalLanguageDescription(),
                tool.getDescription()));
        append(text, "Business purpose", tool.getBusinessPurpose());
        AiContext context = tool.getAiContext();
        if (context != null) {
            if (context.getUseCases() != null && !context.getUseCases().isEmpty()) {
                append(text, "Use when", String.join("; ", context.getUseCases()));
            }
            append(text, "Expected inputs", context.getExpectedInputs());
            append(text, "Expected outputs", context.getExpectedOutputs());
            if (context.getExamplePrompts() != null && !context.getExamplePrompts().isEmpty()) {
                append(text, "Example prompts", String.join(" | ", context.getExamplePrompts()));
            }
        }
        appendPaginationHint(text, tool);
        return text.toString();
    }

    /** Tells the model how to page a large-result tool, so it doesn't over-fetch. */
    private void appendPaginationHint(StringBuilder text, Tool tool) {
        ResponseControl control = tool.getResponseControl();
        if (control == null || !control.isPaginated() || !StringUtils.hasText(control.getLimitParamName())) {
            return;
        }
        StringBuilder hint = new StringBuilder("supports pagination via '")
                .append(control.getLimitParamName()).append("'");
        if (StringUtils.hasText(control.getOffsetParamName())) {
            hint.append("/'").append(control.getOffsetParamName()).append("'");
        }
        if (control.getDefaultLimit() != null) {
            hint.append("; returns up to ").append(control.getDefaultLimit())
                    .append(" items by default — request more via these parameters");
        }
        append(text, "Pagination", hint.toString());
    }

    public String buildInputSchema(Tool tool) {
        ObjectNode schema = objectMapper.createObjectNode();
        schema.put("type", "object");
        ObjectNode properties = schema.putObject("properties");
        ArrayNode required = objectMapper.createArrayNode();

        HttpToolConfig config = tool.getHttpConfig();
        if (config != null) {
            List<ToolParameter> all = new ArrayList<>();
            if (config.getPathVariables() != null) {
                all.addAll(config.getPathVariables());
            }
            if (config.getQueryParameters() != null) {
                all.addAll(config.getQueryParameters());
            }
            if (config.getBodyParameters() != null) {
                all.addAll(config.getBodyParameters());
            }
            for (ToolParameter param : all) {
                ObjectNode property = properties.putObject(param.getName());
                property.put("type", param.getType() == null ? "string" : param.getType());
                if (StringUtils.hasText(param.getDescription())) {
                    property.put("description", param.getDescription());
                }
                if (param.getDefaultValue() != null) {
                    property.put("default", param.getDefaultValue());
                }
                if (param.getEnumValues() != null && !param.getEnumValues().isEmpty()) {
                    ArrayNode enumNode = property.putArray("enum");
                    param.getEnumValues().forEach(enumNode::add);
                }
                if (param.isRequired()) {
                    required.add(param.getName());
                }
            }
        }
        if (!required.isEmpty()) {
            schema.set("required", required);
        }
        try {
            return objectMapper.writeValueAsString(schema);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize input schema for " + tool.getToolName(), e);
        }
    }

    private static void append(StringBuilder text, String label, String value) {
        if (!StringUtils.hasText(value)) {
            return;
        }
        if (!text.isEmpty()) {
            text.append("\n");
        }
        if (label != null) {
            text.append(label).append(": ");
        }
        text.append(value.trim());
    }

    private static String firstNonBlank(String a, String b) {
        return StringUtils.hasText(a) ? a : b;
    }
}
