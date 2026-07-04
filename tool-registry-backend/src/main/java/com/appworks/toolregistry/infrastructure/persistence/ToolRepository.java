package com.appworks.toolregistry.infrastructure.persistence;

import com.appworks.toolregistry.domain.model.Tool;
import com.appworks.toolregistry.domain.model.ToolStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.query.TextCriteria;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ToolRepository extends MongoRepository<Tool, String> {

    Optional<Tool> findByToolName(String toolName);

    boolean existsByToolName(String toolName);

    List<Tool> findByStatus(ToolStatus status);

    List<Tool> findByGroupIdsContaining(String groupId);

    List<Tool> findByStatusAndGroupIdsContaining(ToolStatus status, String groupId);

    long countByGroupIdsContaining(String groupId);

    long countByStatus(ToolStatus status);

    Page<Tool> findAllBy(TextCriteria criteria, Pageable pageable);
}
