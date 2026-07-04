package com.appworks.toolregistry.application;

import com.appworks.toolregistry.api.dto.group.GroupRequest;
import com.appworks.toolregistry.api.dto.group.GroupResponse;
import com.appworks.toolregistry.api.mapper.GroupMapper;
import com.appworks.toolregistry.domain.exception.DuplicateResourceException;
import com.appworks.toolregistry.domain.exception.ResourceConflictException;
import com.appworks.toolregistry.domain.exception.ResourceNotFoundException;
import com.appworks.toolregistry.domain.model.Group;
import com.appworks.toolregistry.infrastructure.persistence.GroupRepository;
import com.appworks.toolregistry.infrastructure.persistence.ToolRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class GroupService {

    private final GroupRepository groupRepository;
    private final ToolRepository toolRepository;
    private final GroupMapper groupMapper;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;

    public GroupResponse create(GroupRequest request) {
        if (groupRepository.existsByName(request.name())) {
            throw new DuplicateResourceException("Group with name '%s' already exists".formatted(request.name()));
        }
        Group group = groupMapper.toEntity(request);
        group.setMcpKey(generateMcpKey());
        Group saved = groupRepository.save(group);
        log.info("Created group '{}' ({}) with MCP key {}", saved.getName(), saved.getId(), saved.getMcpKey());
        return groupMapper.toResponse(saved, 0);
    }

    /** Rotates the group's MCP key — the old group-scoped endpoint stops working immediately. */
    public GroupResponse regenerateMcpKey(String id) {
        Group group = findGroup(id);
        String previousKey = group.getMcpKey();
        group.setMcpKey(generateMcpKey());
        Group saved = groupRepository.save(group);
        eventPublisher.publishEvent(com.appworks.toolregistry.application.event.GroupChangedEvent
                .keyRegenerated(saved, previousKey));
        log.info("Regenerated MCP key for group '{}'", saved.getName());
        return groupMapper.toResponse(saved, toolRepository.countByGroupIdsContaining(id));
    }

    private static String generateMcpKey() {
        return java.util.UUID.randomUUID().toString().replace("-", "");
    }

    public List<GroupResponse> list(String tag, String businessArea, String search) {
        List<Group> groups;
        if (StringUtils.hasText(tag)) {
            groups = groupRepository.findByTagsContaining(tag);
        } else if (StringUtils.hasText(businessArea)) {
            groups = groupRepository.findByBusinessAreaIgnoreCase(businessArea);
        } else {
            groups = groupRepository.findAll();
        }
        if (StringUtils.hasText(search)) {
            String needle = search.toLowerCase();
            groups = groups.stream()
                    .filter(g -> matches(g, needle))
                    .toList();
        }
        return groups.stream()
                .map(g -> groupMapper.toResponse(g, toolRepository.countByGroupIdsContaining(g.getId())))
                .toList();
    }

    public GroupResponse getById(String id) {
        Group group = findGroup(id);
        return groupMapper.toResponse(group, toolRepository.countByGroupIdsContaining(id));
    }

    public GroupResponse update(String id, GroupRequest request) {
        Group group = findGroup(id);
        if (!group.getName().equals(request.name()) && groupRepository.existsByName(request.name())) {
            throw new DuplicateResourceException("Group with name '%s' already exists".formatted(request.name()));
        }
        groupMapper.updateEntity(request, group);
        Group saved = groupRepository.save(group);
        log.info("Updated group '{}' ({})", saved.getName(), saved.getId());
        return groupMapper.toResponse(saved, toolRepository.countByGroupIdsContaining(id));
    }

    public void delete(String id, boolean force) {
        Group group = findGroup(id);
        long toolCount = toolRepository.countByGroupIdsContaining(id);
        if (toolCount > 0) {
            if (!force) {
                throw new ResourceConflictException(
                        "Group '%s' is referenced by %d tool(s). Use force=true to detach and delete."
                                .formatted(group.getName(), toolCount));
            }
            toolRepository.findByGroupIdsContaining(id).forEach(tool -> {
                tool.getGroupIds().remove(id);
                toolRepository.save(tool);
            });
        }
        groupRepository.deleteById(id);
        eventPublisher.publishEvent(
                com.appworks.toolregistry.application.event.GroupChangedEvent.deleted(group));
        log.info("Deleted group '{}' ({})", group.getName(), id);
    }

    private Group findGroup(String id) {
        return groupRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Group", id));
    }

    private boolean matches(Group g, String needle) {
        return contains(g.getName(), needle)
                || contains(g.getDisplayName(), needle)
                || contains(g.getDescription(), needle)
                || contains(g.getBusinessArea(), needle)
                || contains(g.getTeamName(), needle)
                || g.getTags().stream().anyMatch(t -> contains(t, needle));
    }

    private boolean contains(String value, String needle) {
        return value != null && value.toLowerCase().contains(needle);
    }
}
