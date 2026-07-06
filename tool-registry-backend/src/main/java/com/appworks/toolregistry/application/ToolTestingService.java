package com.appworks.toolregistry.application;

import com.appworks.toolregistry.api.dto.test.HealthCheckResponse;
import com.appworks.toolregistry.domain.model.Tool;
import com.appworks.toolregistry.domain.model.invocation.ConnectionTestResult;
import com.appworks.toolregistry.domain.model.invocation.ToolInvocationResult;
import com.appworks.toolregistry.infrastructure.invoker.ToolInvokerRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Sandbox execution, connection testing and health checks for registered tools.
 * Health results are cached briefly to avoid hammering downstream endpoints.
 */
@Service
@RequiredArgsConstructor
public class ToolTestingService {

    private static final Duration HEALTH_CACHE_TTL = Duration.ofSeconds(30);

    private final ToolService toolService;
    private final ToolInvokerRegistry invokerRegistry;

    private final Map<String, HealthCheckResponse> healthCache = new ConcurrentHashMap<>();

    public ToolInvocationResult execute(String toolId, Map<String, Object> arguments) {
        Tool tool = toolService.getDomainById(toolId);
        Map<String, Object> args =
                com.appworks.toolregistry.application.response.ResponseProcessor.applyDefaultLimit(tool, arguments);
        return invokerRegistry.getInvoker(tool.getToolType()).invoke(tool, args);
    }

    public ConnectionTestResult testConnection(String toolId) {
        Tool tool = toolService.getDomainById(toolId);
        return invokerRegistry.getInvoker(tool.getToolType()).testConnection(tool);
    }

    public HealthCheckResponse health(String toolId) {
        HealthCheckResponse cached = healthCache.get(toolId);
        if (cached != null && cached.checkedAt().isAfter(Instant.now().minus(HEALTH_CACHE_TTL))) {
            return cached;
        }
        Tool tool = toolService.getDomainById(toolId);
        ConnectionTestResult result = invokerRegistry.getInvoker(tool.getToolType()).testConnection(tool);
        HealthCheckResponse response = new HealthCheckResponse(
                toolId,
                tool.getToolName(),
                result.reachable(),
                result.statusCode(),
                result.latencyMs(),
                result.message(),
                Instant.now());
        healthCache.put(toolId, response);
        return response;
    }
}
