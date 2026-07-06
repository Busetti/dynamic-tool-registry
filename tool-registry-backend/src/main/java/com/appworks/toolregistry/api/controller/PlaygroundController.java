package com.appworks.toolregistry.api.controller;

import com.appworks.toolregistry.api.dto.playground.ContextTaxReport;
import com.appworks.toolregistry.api.dto.playground.PlaygroundRunReport;
import com.appworks.toolregistry.api.dto.playground.PlaygroundRunRequest;
import com.appworks.toolregistry.application.PlaygroundService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Playground", description = "Token cost analysis for tools, groups and toolsets")
@RestController
@RequestMapping("/api/v1/playground")
@RequiredArgsConstructor
public class PlaygroundController {

    private final PlaygroundService playgroundService;

    @Operation(summary = "Execute a tool and report its response token cost (JSON vs TOON)")
    @PostMapping("/run")
    public PlaygroundRunReport run(@Valid @RequestBody PlaygroundRunRequest request) {
        return playgroundService.run(request);
    }

    @Operation(summary = "Execute a set of tools and report real combined token usage",
            description = "Runs each tool with its parameter defaults; returns per-tool response tokens + definition tokens and grand totals")
    @PostMapping("/run-batch")
    public com.appworks.toolregistry.api.dto.playground.BatchRunReport runBatch(@RequestBody List<String> toolIds) {
        return playgroundService.runBatch(toolIds);
    }

    @Operation(summary = "Execute a group's ACTIVE tools and report real combined token usage")
    @PostMapping("/run-batch/group/{groupId}")
    public com.appworks.toolregistry.api.dto.playground.BatchRunReport runBatchGroup(@PathVariable String groupId) {
        return playgroundService.runBatchGroup(groupId);
    }

    @Operation(summary = "Context tax for a set of tools",
            description = "Total tokens an agent pays just to load these tool definitions")
    @PostMapping("/analyze")
    public ContextTaxReport analyze(@RequestBody List<String> toolIds) {
        return playgroundService.analyze(toolIds);
    }

    @Operation(summary = "Context tax for a group's ACTIVE tools")
    @GetMapping("/analyze/group/{groupId}")
    public ContextTaxReport analyzeGroup(@PathVariable String groupId) {
        return playgroundService.analyzeGroup(groupId);
    }
}
