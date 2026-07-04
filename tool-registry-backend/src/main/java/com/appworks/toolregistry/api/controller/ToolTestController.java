package com.appworks.toolregistry.api.controller;

import com.appworks.toolregistry.api.dto.test.ExecuteToolRequest;
import com.appworks.toolregistry.api.dto.test.HealthCheckResponse;
import com.appworks.toolregistry.application.ToolTestingService;
import com.appworks.toolregistry.domain.model.invocation.ConnectionTestResult;
import com.appworks.toolregistry.domain.model.invocation.ToolInvocationResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Tool Testing", description = "Sandbox execution, connection tests and health checks")
@RestController
@RequestMapping("/api/v1/tools/{id}")
@RequiredArgsConstructor
public class ToolTestController {

    private final ToolTestingService toolTestingService;

    @Operation(summary = "Execute a tool in the sandbox",
            description = "Runs the tool with the given arguments and echoes the full request and response (sensitive headers masked)")
    @PostMapping("/execute")
    public ToolInvocationResult execute(@PathVariable String id, @RequestBody(required = false) ExecuteToolRequest request) {
        return toolTestingService.execute(id, request == null ? null : request.arguments());
    }

    @Operation(summary = "Test connectivity to the tool's endpoint")
    @PostMapping("/test-connection")
    public ConnectionTestResult testConnection(@PathVariable String id) {
        return toolTestingService.testConnection(id);
    }

    @Operation(summary = "Endpoint availability check", description = "Result is cached for ~30 seconds")
    @GetMapping("/health")
    public HealthCheckResponse health(@PathVariable String id) {
        return toolTestingService.health(id);
    }
}
