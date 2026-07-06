package com.appworks.toolregistry.application;

import com.appworks.toolregistry.api.dto.PageResponse;
import com.appworks.toolregistry.api.dto.tool.ToolRequest;
import com.appworks.toolregistry.api.dto.tool.ToolResponse;
import com.appworks.toolregistry.api.dto.tool.ToolSummaryResponse;
import com.appworks.toolregistry.api.mapper.ToolMapper;
import com.appworks.toolregistry.application.event.ToolChangedEvent;
import com.appworks.toolregistry.domain.exception.DuplicateResourceException;
import com.appworks.toolregistry.domain.exception.ResourceNotFoundException;
import com.appworks.toolregistry.domain.model.HttpToolConfig;
import com.appworks.toolregistry.domain.model.Tool;
import com.appworks.toolregistry.domain.model.ToolHeader;
import com.appworks.toolregistry.domain.model.ToolStatus;
import com.appworks.toolregistry.infrastructure.persistence.GroupRepository;
import com.appworks.toolregistry.infrastructure.persistence.ToolRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.TextCriteria;
import org.springframework.data.mongodb.core.query.TextQuery;
import org.springframework.data.support.PageableExecutionUtils;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ToolService {

    private static final Pattern PATH_VAR_PATTERN = Pattern.compile("\\{([a-zA-Z][a-zA-Z0-9_]*)}");
    private static final Pattern BODY_PLACEHOLDER_PATTERN = Pattern.compile("\\{\\{([a-zA-Z][a-zA-Z0-9_]*)}}");

    private final ToolRepository toolRepository;
    private final GroupRepository groupRepository;
    private final ToolMapper toolMapper;
    private final MongoTemplate mongoTemplate;
    private final ApplicationEventPublisher eventPublisher;
    private final CurlCommandParser curlCommandParser;
    private final com.appworks.toolregistry.infrastructure.invoker.ToolInvokerRegistry invokerRegistry;

    /**
     * One-shot registration: parses the curl command and combines it with the
     * mandatory business details into a normal (DRAFT) tool registration.
     */
    public ToolResponse quickRegister(com.appworks.toolregistry.api.dto.tool.QuickRegisterRequest request) {
        CurlCommandParser.ParsedCurl parsed = curlCommandParser.parse(request.curl());

        var httpConfig = new com.appworks.toolregistry.api.dto.tool.HttpConfigDto(
                parsed.method(),
                parsed.uri(),
                parsed.contentType(),
                null,
                parsed.headers().stream()
                        .map(h -> new com.appworks.toolregistry.api.dto.tool.HeaderDto(
                                h.name(), h.value(), null, false, h.sensitive()))
                        .toList(),
                toParameterDtos(parsed.queryParameters()),
                List.of(),
                toParameterDtos(parsed.bodyParameters()),
                parsed.requestBodyTemplate());

        ToolRequest toolRequest = new ToolRequest(
                request.toolName(),
                request.displayName(),
                request.description(),
                request.businessPurpose(),
                null,
                request.category(),
                request.tags(),
                "1.0.0",
                request.groupIds(),
                "HTTP",
                httpConfig,
                null,
                null,
                null,
                new com.appworks.toolregistry.api.dto.tool.AiContextDto(
                        request.description(), null, null, null, null, null, null, null));

        return create(toolRequest);
    }

    private static List<com.appworks.toolregistry.api.dto.tool.ParameterDto> toParameterDtos(
            List<CurlCommandParser.ParsedParameter> parameters) {
        return parameters.stream()
                .map(p -> new com.appworks.toolregistry.api.dto.tool.ParameterDto(
                        p.name(), p.type(), null, p.required(), p.defaultValue(), null))
                .toList();
    }

    public ToolResponse create(ToolRequest request) {
        if (toolRepository.existsByToolName(request.toolName())) {
            throw new DuplicateResourceException("Tool with name '%s' already exists".formatted(request.toolName()));
        }
        validateRequest(request);
        Tool tool = toolMapper.toEntity(request);
        tool.setStatus(ToolStatus.DRAFT);
        Tool saved = toolRepository.save(tool);
        eventPublisher.publishEvent(new ToolChangedEvent(ToolChangedEvent.ChangeType.CREATED, saved));
        log.info("Registered tool '{}' ({})", saved.getToolName(), saved.getId());
        return toolMapper.toResponse(saved);
    }

    public PageResponse<ToolSummaryResponse> list(String status, String groupId, String category,
                                                  String tag, String toolType, String search,
                                                  int page, int size, String sort) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100), parseSort(sort));

        List<Criteria> criteria = new ArrayList<>();
        if (StringUtils.hasText(status)) {
            criteria.add(Criteria.where("status").is(status.toUpperCase()));
        }
        if (StringUtils.hasText(groupId)) {
            criteria.add(Criteria.where("groupIds").is(groupId));
        }
        if (StringUtils.hasText(category)) {
            criteria.add(Criteria.where("category").is(category));
        }
        if (StringUtils.hasText(tag)) {
            criteria.add(Criteria.where("tags").is(tag));
        }
        if (StringUtils.hasText(toolType)) {
            criteria.add(Criteria.where("toolType").is(toolType.toUpperCase()));
        }

        Query query = StringUtils.hasText(search)
                ? TextQuery.queryText(TextCriteria.forDefaultLanguage().matching(search)).sortByScore()
                : new Query();
        criteria.forEach(query::addCriteria);

        long total = mongoTemplate.count(Query.of(query).limit(-1).skip(-1), Tool.class);
        query.with(pageable);
        List<Tool> tools = mongoTemplate.find(query, Tool.class);

        return PageResponse.from(
                PageableExecutionUtils.getPage(tools, pageable, () -> total),
                toolMapper::toSummary);
    }

    public List<ToolSummaryResponse> listByGroup(String groupId) {
        requireGroup(groupId);
        return toolRepository.findByGroupIdsContaining(groupId).stream()
                .map(toolMapper::toSummary)
                .toList();
    }

    public ToolResponse getById(String id) {
        return toolMapper.toResponse(findTool(id));
    }

    public Tool getDomainById(String id) {
        return findTool(id);
    }

    public ToolResponse update(String id, ToolRequest request) {
        Tool tool = findTool(id);
        if (!tool.getToolName().equals(request.toolName()) && toolRepository.existsByToolName(request.toolName())) {
            throw new DuplicateResourceException("Tool with name '%s' already exists".formatted(request.toolName()));
        }
        validateRequest(request);
        Map<String, String> previousSensitiveValues = sensitiveHeaderValues(tool);
        toolMapper.updateEntity(request, tool);
        restoreMaskedSensitiveValues(tool, previousSensitiveValues);
        Tool saved = toolRepository.save(tool);
        eventPublisher.publishEvent(new ToolChangedEvent(ToolChangedEvent.ChangeType.UPDATED, saved));
        log.info("Updated tool '{}' ({})", saved.getToolName(), saved.getId());
        return toolMapper.toResponse(saved);
    }

    public ToolResponse changeStatus(String id, ToolStatus newStatus) {
        Tool tool = findTool(id);
        if (tool.getStatus() == newStatus) {
            return toolMapper.toResponse(tool);
        }
        if (newStatus == ToolStatus.ACTIVE) {
            requireSuccessfulConnectionTest(tool);
        }
        tool.setStatus(newStatus);
        Tool saved = toolRepository.save(tool);
        eventPublisher.publishEvent(new ToolChangedEvent(ToolChangedEvent.ChangeType.UPDATED, saved));
        log.info("Tool '{}' status changed to {}", saved.getToolName(), newStatus);
        return toolMapper.toResponse(saved);
    }

    /**
     * A tool may only go ACTIVE (and hence be exposed to AI clients) after its
     * endpoint proves reachable — protects consumers from dead tools.
     */
    private void requireSuccessfulConnectionTest(Tool tool) {
        var result = invokerRegistry.getInvoker(tool.getToolType()).testConnection(tool);
        if (!result.reachable()) {
            throw new com.appworks.toolregistry.domain.exception.ResourceConflictException(
                    "Activation blocked — endpoint connection test failed: "
                            + (result.message() == null ? "unreachable" : result.message()));
        }
        log.info("Activation pre-check passed for '{}' (HTTP {}, {} ms)",
                tool.getToolName(), result.statusCode(), result.latencyMs());
    }

    /** Adds an existing tool to a group (a tool can belong to many groups). */
    public ToolResponse attachToGroup(String groupId, String toolId) {
        requireGroup(groupId);
        Tool tool = findTool(toolId);
        if (!tool.getGroupIds().contains(groupId)) {
            tool.getGroupIds().add(groupId);
            tool = toolRepository.save(tool);
            eventPublisher.publishEvent(new ToolChangedEvent(ToolChangedEvent.ChangeType.UPDATED, tool));
            log.info("Attached tool '{}' to group {}", tool.getToolName(), groupId);
        }
        return toolMapper.toResponse(tool);
    }

    /** Removes a tool from a group without deleting the tool. */
    public ToolResponse detachFromGroup(String groupId, String toolId) {
        requireGroup(groupId);
        Tool tool = findTool(toolId);
        if (tool.getGroupIds().remove(groupId)) {
            tool = toolRepository.save(tool);
            eventPublisher.publishEvent(new ToolChangedEvent(ToolChangedEvent.ChangeType.UPDATED, tool));
            log.info("Detached tool '{}' from group {}", tool.getToolName(), groupId);
        }
        return toolMapper.toResponse(tool);
    }

    public void delete(String id) {
        Tool tool = findTool(id);
        toolRepository.deleteById(id);
        eventPublisher.publishEvent(new ToolChangedEvent(ToolChangedEvent.ChangeType.DELETED, tool));
        log.info("Deleted tool '{}' ({})", tool.getToolName(), id);
    }

    public Map<String, Long> statusCounts() {
        return java.util.Arrays.stream(ToolStatus.values())
                .collect(Collectors.toMap(Enum::name, toolRepository::countByStatus,
                        (a, b) -> a, java.util.LinkedHashMap::new));
    }

    private Tool findTool(String id) {
        return toolRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tool", id));
    }

    private void requireGroup(String groupId) {
        if (!groupRepository.existsById(groupId)) {
            throw new ResourceNotFoundException("Group", groupId);
        }
    }

    /**
     * Cross-field validation that bean validation cannot express:
     * path variables must match the URI template, POST body placeholders must
     * be declared, GET tools must not declare a body, and groups must exist.
     */
    private void validateRequest(ToolRequest request) {
        var config = request.httpConfig();

        Set<String> uriVars = extract(PATH_VAR_PATTERN, config.uri());
        Set<String> declaredPathVars = config.pathVariables() == null ? Set.of()
                : config.pathVariables().stream().map(p -> p.name()).collect(Collectors.toSet());
        if (!uriVars.equals(declaredPathVars)) {
            throw new IllegalArgumentException(
                    "Path variables in URI %s must exactly match declared pathVariables %s"
                            .formatted(uriVars, declaredPathVars));
        }

        boolean hasBody = StringUtils.hasText(config.requestBodyTemplate())
                || (config.bodyParameters() != null && !config.bodyParameters().isEmpty());
        if ("GET".equals(config.method()) && hasBody) {
            throw new IllegalArgumentException("GET tools must not declare a request body");
        }
        if (StringUtils.hasText(config.requestBodyTemplate())) {
            Set<String> placeholders = extract(BODY_PLACEHOLDER_PATTERN, config.requestBodyTemplate());
            Set<String> declaredBodyParams = config.bodyParameters() == null ? Set.of()
                    : config.bodyParameters().stream().map(p -> p.name()).collect(Collectors.toSet());
            placeholders.removeAll(declaredBodyParams);
            if (!placeholders.isEmpty()) {
                throw new IllegalArgumentException(
                        "Body template placeholders %s are not declared as bodyParameters".formatted(placeholders));
            }
        }

        Set<String> allParamNames = new HashSet<>();
        for (var params : List.of(
                config.pathVariables() == null ? List.<com.appworks.toolregistry.api.dto.tool.ParameterDto>of() : config.pathVariables(),
                config.queryParameters() == null ? List.<com.appworks.toolregistry.api.dto.tool.ParameterDto>of() : config.queryParameters(),
                config.bodyParameters() == null ? List.<com.appworks.toolregistry.api.dto.tool.ParameterDto>of() : config.bodyParameters())) {
            for (var p : params) {
                if (!allParamNames.add(p.name())) {
                    throw new IllegalArgumentException(
                            "Duplicate parameter name '%s' across path/query/body parameters".formatted(p.name()));
                }
            }
        }

        if (request.groupIds() != null) {
            request.groupIds().forEach(this::requireGroup);
        }
    }

    private Map<String, String> sensitiveHeaderValues(Tool tool) {
        if (tool.getHttpConfig() == null || tool.getHttpConfig().getHeaders() == null) {
            return Map.of();
        }
        return tool.getHttpConfig().getHeaders().stream()
                .filter(ToolHeader::isSensitive)
                .filter(h -> h.getValue() != null)
                .collect(Collectors.toMap(ToolHeader::getName, ToolHeader::getValue, (a, b) -> a));
    }

    /**
     * Clients receive masked sensitive values; when they send the mask back
     * unchanged on update, keep the previously stored secret.
     */
    private void restoreMaskedSensitiveValues(Tool tool, Map<String, String> previousValues) {
        HttpToolConfig config = tool.getHttpConfig();
        if (config == null || config.getHeaders() == null) {
            return;
        }
        config.getHeaders().stream()
                .filter(h -> ToolMapper.MASKED_VALUE.equals(h.getValue()))
                .forEach(h -> h.setValue(previousValues.get(h.getName())));
    }

    private Set<String> extract(Pattern pattern, String input) {
        Set<String> names = new HashSet<>();
        if (input == null) {
            return names;
        }
        Matcher matcher = pattern.matcher(input);
        while (matcher.find()) {
            names.add(matcher.group(1));
        }
        return names;
    }

    private Sort parseSort(String sort) {
        if (!StringUtils.hasText(sort)) {
            return Sort.by(Sort.Direction.DESC, "updatedAt");
        }
        String[] parts = sort.split(",");
        Sort.Direction direction = parts.length > 1 && "asc".equalsIgnoreCase(parts[1])
                ? Sort.Direction.ASC : Sort.Direction.DESC;
        return Sort.by(direction, parts[0]);
    }
}
