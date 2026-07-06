package com.appworks.toolregistry.application;

import com.appworks.toolregistry.api.dto.playground.ContextTaxReport;
import com.appworks.toolregistry.api.dto.playground.PlaygroundRunReport;
import com.appworks.toolregistry.api.dto.playground.PlaygroundRunRequest;
import com.appworks.toolregistry.api.dto.playground.ToolDefinitionCost;
import com.appworks.toolregistry.application.response.ProcessedResponse;
import com.appworks.toolregistry.application.response.ResponseProcessor;
import com.appworks.toolregistry.application.token.TokenAnalyzer;
import com.appworks.toolregistry.domain.model.ResponseFormat;
import com.appworks.toolregistry.domain.model.Tool;
import com.appworks.toolregistry.domain.model.ToolStatus;
import com.appworks.toolregistry.domain.model.invocation.ToolInvocationResult;
import com.appworks.toolregistry.infrastructure.persistence.ToolRepository;
import com.appworks.toolregistry.mcp.ToolDefinitionFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

/**
 * Powers the token playground: executes a tool and reports the real token cost
 * of what the LLM receives (JSON vs TOON), and computes the "context tax" — the
 * fixed token cost of loading a set of tools' definitions.
 */
@Service
@RequiredArgsConstructor
public class PlaygroundService {

    private final ToolService toolService;
    private final ToolRepository toolRepository;
    private final ToolTestingService toolTestingService;
    private final ResponseProcessor responseProcessor;
    private final TokenAnalyzer tokenAnalyzer;
    private final ToolDefinitionFactory toolDefinitionFactory;

    @Value("${tool-registry.tokens.warn-threshold:2000}")
    private int warnThreshold;

    public PlaygroundRunReport run(PlaygroundRunRequest request) {
        Tool tool = toolService.getDomainById(request.toolId());
        Map<String, Object> args = request.arguments() == null ? Map.of() : request.arguments();

        int definitionTokens = definitionTokens(tool);
        ToolInvocationResult result = toolTestingService.execute(request.toolId(), args);

        if (!result.success()) {
            return PlaygroundRunReport.builder()
                    .toolId(tool.getId()).toolName(tool.getToolName())
                    .success(false).statusCode(result.statusCode()).durationMs(result.durationMs())
                    .definitionTokens(definitionTokens)
                    .tokenEncoding(TokenAnalyzer.ENCODING_LABEL)
                    .error(result.error() != null ? result.error()
                            : "HTTP " + result.statusCode() + ": " + result.responseBody())
                    .build();
        }

        String raw = result.responseBody();
        ProcessedResponse asJson = responseProcessor.process(tool, raw, ResponseFormat.JSON);
        ProcessedResponse asToon = responseProcessor.process(tool, raw, ResponseFormat.TOON);

        int tokensJson = tokenAnalyzer.count(asJson.body());
        int tokensToon = tokenAnalyzer.count(asToon.body());
        int saved = Math.max(0, tokensJson - tokensToon);
        double savedPct = tokensJson > 0 ? (saved * 100.0 / tokensJson) : 0.0;

        ResponseFormat delivered = request.formatOverride() != null
                ? ResponseFormat.valueOf(request.formatOverride())
                : (tool.getResponseControl() != null && tool.getResponseControl().getFormat() != null
                    ? tool.getResponseControl().getFormat() : ResponseFormat.JSON);

        int deliveredTokens = delivered == ResponseFormat.TOON ? tokensToon : tokensJson;
        boolean unbounded = responseProcessor.isUnboundedArray(raw, 25)
                && (tool.getResponseControl() == null || !tool.getResponseControl().isLimitEnabled());
        boolean warning = deliveredTokens > warnThreshold || unbounded;
        String warningReason = !warning ? null
                : deliveredTokens > warnThreshold
                    ? "~%,d tokens per response (over %,d) — consider TOON or a limit"
                        .formatted(deliveredTokens, warnThreshold)
                    : "unbounded array response with no limit configured";

        return PlaygroundRunReport.builder()
                .toolId(tool.getId()).toolName(tool.getToolName())
                .success(true).statusCode(result.statusCode()).durationMs(result.durationMs())
                .deliveredFormat(delivered.name())
                .responseJson(asJson.body()).responseToon(asToon.body())
                .tokensJson(tokensJson).tokensToon(tokensToon).tokensSaved(saved)
                .savedPct(Math.round(savedPct * 10) / 10.0)
                .definitionTokens(definitionTokens)
                .sizeBytes(raw == null ? 0 : raw.getBytes(StandardCharsets.UTF_8).length)
                .originalItems(asJson.originalItems()).deliveredItems(asJson.deliveredItems())
                .truncated(asJson.truncated())
                .warning(warning).warningReason(warningReason)
                .tokenEncoding(TokenAnalyzer.ENCODING_LABEL)
                .build();
    }

    /**
     * Executes every tool in the set (arguments built from parameter defaults)
     * and reports real token usage: definition cost + actual response tokens.
     * Tools with required parameters lacking defaults are reported as skipped.
     */
    public com.appworks.toolregistry.api.dto.playground.BatchRunReport runBatch(List<String> toolIds) {
        List<com.appworks.toolregistry.api.dto.playground.BatchRunReport.BatchToolResult> results =
                toolIds.stream().map(id -> runOne(toolService.getDomainById(id))).toList();
        return toBatchReport(results);
    }

    /** Batch run over a group's ACTIVE tools. */
    public com.appworks.toolregistry.api.dto.playground.BatchRunReport runBatchGroup(String groupId) {
        List<com.appworks.toolregistry.api.dto.playground.BatchRunReport.BatchToolResult> results =
                toolRepository.findByStatusAndGroupIdsContaining(ToolStatus.ACTIVE, groupId).stream()
                        .map(this::runOne)
                        .toList();
        return toBatchReport(results);
    }

    private com.appworks.toolregistry.api.dto.playground.BatchRunReport toBatchReport(
            List<com.appworks.toolregistry.api.dto.playground.BatchRunReport.BatchToolResult> results) {
        int def = results.stream().mapToInt(r -> r.definitionTokens()).sum();
        int resp = results.stream().mapToInt(r -> r.responseTokens()).sum();
        return com.appworks.toolregistry.api.dto.playground.BatchRunReport.builder()
                .results(results)
                .totalDefinitionTokens(def)
                .totalResponseTokens(resp)
                .totalTokens(def + resp)
                .toolCount(results.size())
                .executedCount((int) results.stream().filter(r -> r.executed()).count())
                .tokenEncoding(TokenAnalyzer.ENCODING_LABEL)
                .build();
    }

    private com.appworks.toolregistry.api.dto.playground.BatchRunReport.BatchToolResult runOne(Tool tool) {
        var builder = com.appworks.toolregistry.api.dto.playground.BatchRunReport.BatchToolResult.builder()
                .toolId(tool.getId()).toolName(tool.getToolName()).displayName(tool.getDisplayName())
                .definitionTokens(definitionTokens(tool));

        Map<String, Object> args;
        try {
            args = defaultArguments(tool);
        } catch (IllegalStateException e) {
            return builder.executed(false).skipReason(e.getMessage()).build();
        }
        try {
            ToolInvocationResult result = toolTestingService.execute(tool.getId(), args);
            if (!result.success()) {
                return builder.executed(false)
                        .statusCode(result.statusCode()).durationMs(result.durationMs())
                        .skipReason(result.error() != null ? result.error() : "HTTP " + result.statusCode())
                        .build();
            }
            String raw = result.responseBody();
            ProcessedResponse asJson = responseProcessor.process(tool, raw, ResponseFormat.JSON);
            ProcessedResponse asToon = responseProcessor.process(tool, raw, ResponseFormat.TOON);
            int tokensJson = tokenAnalyzer.count(asJson.body());
            int tokensToon = tokenAnalyzer.count(asToon.body());
            ResponseFormat saved = tool.getResponseControl() != null && tool.getResponseControl().getFormat() != null
                    ? tool.getResponseControl().getFormat() : ResponseFormat.JSON;
            int delivered = saved == ResponseFormat.TOON ? tokensToon : tokensJson;
            boolean unbounded = responseProcessor.isUnboundedArray(raw, 25)
                    && (tool.getResponseControl() == null || !tool.getResponseControl().isLimitEnabled());
            boolean warning = delivered > warnThreshold || unbounded;
            return builder.executed(true)
                    .statusCode(result.statusCode()).durationMs(result.durationMs())
                    .deliveredFormat(saved.name())
                    .responseTokens(delivered).tokensJson(tokensJson).tokensToon(tokensToon)
                    .truncated(asJson.truncated())
                    .warning(warning)
                    .warningReason(!warning ? null
                            : delivered > warnThreshold
                                ? "~%,d tokens per response — consider TOON or a limit".formatted(delivered)
                                : "unbounded array response with no limit configured")
                    .build();
        } catch (Exception e) {
            return builder.executed(false).skipReason(e.getMessage()).build();
        }
    }

    /** Builds call arguments from parameter defaults; fails if a required param has none. */
    private Map<String, Object> defaultArguments(Tool tool) {
        Map<String, Object> args = new java.util.HashMap<>();
        var config = tool.getHttpConfig();
        if (config == null) {
            return args;
        }
        List<com.appworks.toolregistry.domain.model.ToolParameter> all = new java.util.ArrayList<>();
        if (config.getPathVariables() != null) all.addAll(config.getPathVariables());
        if (config.getQueryParameters() != null) all.addAll(config.getQueryParameters());
        if (config.getBodyParameters() != null) all.addAll(config.getBodyParameters());
        for (var param : all) {
            if (param.getDefaultValue() != null && !param.getDefaultValue().isBlank()) {
                args.put(param.getName(), coerce(param.getDefaultValue(), param.getType()));
            } else if (param.isRequired()) {
                throw new IllegalStateException(
                        "required parameter '%s' has no default value — run it individually with arguments"
                                .formatted(param.getName()));
            }
        }
        return args;
    }

    private Object coerce(String value, String type) {
        try {
            return switch (type == null ? "string" : type) {
                case "integer" -> Long.parseLong(value);
                case "number" -> Double.parseDouble(value);
                case "boolean" -> Boolean.parseBoolean(value);
                default -> value;
            };
        } catch (NumberFormatException e) {
            return value;
        }
    }

    /** Context tax for an explicit list of tool ids. */
    public ContextTaxReport analyze(List<String> toolIds) {
        List<ToolDefinitionCost> costs = toolIds.stream()
                .map(toolService::getDomainById)
                .map(this::definitionCost)
                .toList();
        return toReport(costs);
    }

    /** Context tax for a group's ACTIVE tools. */
    public ContextTaxReport analyzeGroup(String groupId) {
        List<ToolDefinitionCost> costs = toolRepository
                .findByStatusAndGroupIdsContaining(ToolStatus.ACTIVE, groupId).stream()
                .map(this::definitionCost)
                .toList();
        return toReport(costs);
    }

    private ContextTaxReport toReport(List<ToolDefinitionCost> costs) {
        int total = costs.stream().mapToInt(ToolDefinitionCost::definitionTokens).sum();
        return new ContextTaxReport(costs, total, costs.size(), TokenAnalyzer.ENCODING_LABEL);
    }

    private ToolDefinitionCost definitionCost(Tool tool) {
        int descriptionTokens = tokenAnalyzer.count(toolDefinitionFactory.composeDescription(tool));
        int schemaTokens = tokenAnalyzer.count(toolDefinitionFactory.buildInputSchema(tool));
        return new ToolDefinitionCost(tool.getId(), tool.getToolName(), tool.getDisplayName(),
                tool.getStatus().name(), descriptionTokens, schemaTokens, descriptionTokens + schemaTokens);
    }

    private int definitionTokens(Tool tool) {
        return tokenAnalyzer.count(toolDefinitionFactory.composeDescription(tool))
                + tokenAnalyzer.count(toolDefinitionFactory.buildInputSchema(tool));
    }
}
