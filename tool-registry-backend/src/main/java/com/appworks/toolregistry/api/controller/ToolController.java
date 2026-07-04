package com.appworks.toolregistry.api.controller;

import com.appworks.toolregistry.api.dto.PageResponse;
import com.appworks.toolregistry.api.dto.tool.StatusChangeRequest;
import com.appworks.toolregistry.api.dto.tool.ToolRequest;
import com.appworks.toolregistry.api.dto.tool.ToolResponse;
import com.appworks.toolregistry.api.dto.tool.ToolSummaryResponse;
import com.appworks.toolregistry.application.ToolService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Tag(name = "Tools", description = "Register and manage APIs as AI tools")
@RestController
@RequestMapping("/api/v1/tools")
@RequiredArgsConstructor
public class ToolController {

    private final ToolService toolService;
    private final com.appworks.toolregistry.application.CurlCommandParser curlCommandParser;

    @Operation(summary = "Register a tool", description = "New tools start in DRAFT status; activate via the status endpoint")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ToolResponse create(@Valid @RequestBody ToolRequest request) {
        return toolService.create(request);
    }

    @Operation(summary = "Parse a curl command",
            description = "Converts a pasted curl command into an HTTP tool configuration preview (method, URI, headers, query/body parameters, body template)")
    @PostMapping("/parse-curl")
    public com.appworks.toolregistry.application.CurlCommandParser.ParsedCurl parseCurl(
            @Valid @RequestBody com.appworks.toolregistry.api.dto.tool.ParseCurlRequest request) {
        return curlCommandParser.parse(request.curl());
    }

    @Operation(summary = "Quick-register a tool from a curl command",
            description = "One call: curl command + mandatory details (toolName, displayName, description) → DRAFT tool")
    @PostMapping("/quick-register")
    @ResponseStatus(HttpStatus.CREATED)
    public ToolResponse quickRegister(
            @Valid @RequestBody com.appworks.toolregistry.api.dto.tool.QuickRegisterRequest request) {
        return toolService.quickRegister(request);
    }

    @Operation(summary = "List tools", description = "Paged with optional filters and weighted full-text search")
    @GetMapping
    public PageResponse<ToolSummaryResponse> list(
            @Parameter(description = "Filter by status (DRAFT/ACTIVE/DEPRECATED/DISABLED)")
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String groupId,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) String toolType,
            @Parameter(description = "Full-text search over names, descriptions, keywords and aliases")
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Sort as field,direction e.g. updatedAt,desc")
            @RequestParam(required = false) String sort) {
        return toolService.list(status, groupId, category, tag, toolType, search, page, size, sort);
    }

    @Operation(summary = "Tool counts by status")
    @GetMapping("/stats/status-counts")
    public Map<String, Long> statusCounts() {
        return toolService.statusCounts();
    }

    @Operation(summary = "Get a tool by id")
    @GetMapping("/{id}")
    public ToolResponse get(@PathVariable String id) {
        return toolService.getById(id);
    }

    @Operation(summary = "Update a tool")
    @PutMapping("/{id}")
    public ToolResponse update(@PathVariable String id, @Valid @RequestBody ToolRequest request) {
        return toolService.update(id, request);
    }

    @Operation(summary = "Change tool status",
            description = "ACTIVE tools are registered with the MCP server; any other status removes them — no restart required")
    @PatchMapping("/{id}/status")
    public ToolResponse changeStatus(@PathVariable String id, @Valid @RequestBody StatusChangeRequest request) {
        return toolService.changeStatus(id, request.status());
    }

    @Operation(summary = "Delete a tool")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        toolService.delete(id);
    }
}
